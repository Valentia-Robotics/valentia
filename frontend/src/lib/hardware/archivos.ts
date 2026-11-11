/**
 * ESPACIOS DE ARCHIVOS DEL EQUIPO DE HARDWARE (base de datos + almacén privado)
 * Quién puede qué:
 *   - Alguien con rol HARDWARE: ver, subir, descargar y borrar en SU espacio.
 *   - Un ADMIN: lo mismo en el espacio de cualquiera.
 *   - Nadie más (tampoco otra persona de hardware).
 * Todas las rutas y acciones pasan por aquí: los permisos se comprueban en un solo sitio.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import {
  conCarpetasDeArriba,
  CUOTA_BYTES_PERSONA,
  estaDentroDe,
  limpiarCarpeta,
  MAXIMO_NIVELES_CARPETA,
  limpiarNombreArchivo,
  MAXIMO_BYTES_ARCHIVO,
  MAXIMO_MB_ARCHIVO,
  tamanoLegible,
} from "@/config/hardware";
import { ultimaConexion, ultimoDispositivo } from "@/lib/admin/equipo";
import {
  borrarPrivado,
  ErrorAlmacenPrivado,
  guardarPrivado,
  leerPrivado,
} from "@/lib/almacenamiento/privado";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import type { UsuarioActual } from "@/lib/sesion";

/** Error con un mensaje que se puede enseñar tal cual */
export class ErrorArchivo extends Error {}

/** ¿Puede esta persona entrar en el espacio de `duenoId`? */
export function puedeUsarEspacio(usuario: Pick<UsuarioActual, "id" | "rol">, duenoId: string) {
  return usuario.rol === "ADMIN" || (usuario.rol === "HARDWARE" && usuario.id === duenoId);
}

/** Bytes que ocupa el espacio de una persona */
export async function espacioUsado(duenoId: string): Promise<number> {
  const suma = await db.archivoHardware.aggregate({
    where: { duenoId },
    _sum: { tamano: true },
  });
  return suma._sum.tamano ?? 0;
}

/** El dueño de un espacio: alguien con el rol HARDWARE, o que lo tuvo y aún tiene archivos */
export async function duenoDeEspacio(duenoId: string) {
  if (!esId(duenoId)) return null;
  const dueno = await db.usuario.findUnique({
    where: { id: duenoId },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      _count: { select: { archivosHardware: true } },
    },
  });
  if (!dueno || (dueno.rol !== "HARDWARE" && dueno._count.archivosHardware === 0)) return null;
  return dueno;
}

/** Los archivos de un espacio, por carpeta y nombre, y lo que ocupan */
export async function verEspacio(duenoId: string) {
  const archivos = await db.archivoHardware.findMany({
    where: { duenoId },
    orderBy: [{ carpeta: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      carpeta: true,
      tamano: true,
      subidoPorNombre: true,
      subidoEn: true,
    },
  });
  const guardadas = (
    await db.carpetaHardware.findMany({ where: { duenoId }, select: { ruta: true } })
  ).map((c) => c.ruta);
  const usados = archivos.reduce((total, a) => total + a.tamano, 0);
  const carpetas = [
    ...new Set([...archivos.map((a) => a.carpeta).filter(Boolean), ...guardadas]),
  ].sort();
  return { archivos, usados, carpetas, guardadas };
}

/** Carpetas que se pueden crear de una vez (al soltar una carpeta con muchas subcarpetas vacías) */
const MAXIMO_CARPETAS_DE_GOLPE = 500;

/** Comprueba que se puede escribir en el espacio (permiso y rol del dueño) */
async function exigirEspacioActivo(usuario: UsuarioActual, duenoId: string) {
  if (!esId(duenoId) || !puedeUsarEspacio(usuario, duenoId)) {
    throw new ErrorArchivo("No puedes cambiar este espacio.");
  }
  const dueno = await db.usuario.findUnique({ where: { id: duenoId }, select: { rol: true } });
  if (dueno?.rol !== "HARDWARE") {
    throw new ErrorArchivo(
      "Esta persona ya no es del equipo de hardware: no se pueden crear carpetas.",
    );
  }
}

/**
 * Guarda carpetas en el espacio (y las de arriba de cada una) para que se vean aunque estén vacías.
 * Las que ya existían no se repiten. Devuelve cuántas son nuevas.
 */
export async function crearCarpetas(usuario: UsuarioActual, duenoId: string, rutas: string[]) {
  await exigirEspacioActivo(usuario, duenoId);
  if (rutas.length > MAXIMO_CARPETAS_DE_GOLPE) {
    throw new ErrorArchivo(`Como mucho ${MAXIMO_CARPETAS_DE_GOLPE} carpetas de una vez.`);
  }
  const limpias: string[] = [];
  for (const ruta of rutas) {
    const limpia = limpiarCarpeta(ruta);
    if (limpia === null) {
      throw new ErrorArchivo(
        `El nombre de la carpeta no vale (máximo ${MAXIMO_NIVELES_CARPETA} niveles de 60 letras, sin caracteres como : * ? < >).`,
      );
    }
    if (limpia) limpias.push(limpia);
  }
  const todas = conCarpetasDeArriba(limpias);
  if (todas.length === 0) throw new ErrorArchivo("Escribe el nombre de la carpeta.");
  if (todas.length > MAXIMO_CARPETAS_DE_GOLPE) {
    throw new ErrorArchivo(`Como mucho ${MAXIMO_CARPETAS_DE_GOLPE} carpetas de una vez.`);
  }
  return guardarRutas(duenoId, todas);
}

/** Apunta las carpetas (ya limpias, con las de arriba) que aún no estén guardadas */
async function guardarRutas(duenoId: string, todas: string[]) {
  const ya = new Set(
    (
      await db.carpetaHardware.findMany({
        where: { duenoId, ruta: { in: todas } },
        select: { ruta: true },
      })
    ).map((c) => c.ruta),
  );
  const nuevas = todas.filter((r) => !ya.has(r));
  for (const ruta of nuevas) {
    // Una a una: si otra pestaña la ha creado justo ahora, el índice único la rechaza y se sigue
    await db.carpetaHardware.create({ data: { duenoId, ruta } }).catch((error: unknown) => {
      if ((error as { code?: string }).code !== "P2002") throw error;
    });
  }
  return nuevas.length;
}

/**
 * Borra una carpeta VACÍA (y sus subcarpetas, también vacías). Si hay algún archivo dentro no la
 * borra: primero hay que borrar los archivos (así nunca se pierde nada sin querer).
 */
export async function borrarCarpeta(usuario: UsuarioActual, duenoId: string, ruta: string) {
  if (!esId(duenoId) || !puedeUsarEspacio(usuario, duenoId)) {
    throw new ErrorArchivo("No puedes cambiar este espacio.");
  }
  const carpeta = limpiarCarpeta(ruta);
  if (!carpeta) throw new ErrorArchivo("Esa carpeta no existe.");
  const conArchivos = await db.archivoHardware.findMany({
    where: { duenoId, carpeta: { startsWith: carpeta } },
    select: { carpeta: true },
  });
  if (conArchivos.some((a) => estaDentroDe(a.carpeta, carpeta))) {
    throw new ErrorArchivo("La carpeta tiene archivos dentro: bórralos antes.");
  }
  const guardadas = await db.carpetaHardware.findMany({
    where: { duenoId, ruta: { startsWith: carpeta } },
    select: { id: true, ruta: true },
  });
  const ids = guardadas.filter((c) => estaDentroDe(c.ruta, carpeta)).map((c) => c.id);
  await db.carpetaHardware.deleteMany({ where: { id: { in: ids } } });
}

/** Para el panel: cada persona de hardware (o con archivos) con lo que tiene y su última conexión */
export async function personasHardware() {
  const conArchivos = await db.archivoHardware.groupBy({
    by: ["duenoId"],
    _sum: { tamano: true },
    _count: { _all: true },
  });
  const personas = await db.usuario.findMany({
    where: { OR: [{ rol: "HARDWARE" }, { id: { in: conArchivos.map((c) => c.duenoId) } }] },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      ultimaConexionEn: true,
      dispositivos: ultimoDispositivo,
    },
  });
  const porDueno = new Map(conArchivos.map((c) => [c.duenoId, c]));
  return personas.map(({ dispositivos, ...p }) => ({
    ...p,
    ultima: ultimaConexion(p.ultimaConexionEn, dispositivos),
    archivos: porDueno.get(p.id)?._count._all ?? 0,
    usados: porDueno.get(p.id)?._sum.tamano ?? 0,
  }));
}

/**
 * Sube un archivo al espacio de `duenoId`. Comprueba permiso, tamaño y espacio libre; primero lo
 * guarda en el almacén y luego lo apunta (si apuntarlo falla, lo vuelve a borrar).
 */
export async function subirArchivo(datos: {
  usuario: UsuarioActual;
  duenoId: string;
  nombre: string;
  carpeta: string;
  tipo: string;
  contenido: Buffer;
}) {
  const { usuario, duenoId, contenido } = datos;
  if (!esId(duenoId) || !puedeUsarEspacio(usuario, duenoId)) {
    throw new ErrorArchivo("No puedes subir archivos a este espacio.");
  }
  const dueno = await db.usuario.findUnique({ where: { id: duenoId }, select: { rol: true } });
  if (dueno?.rol !== "HARDWARE") {
    throw new ErrorArchivo(
      "Esta persona ya no es del equipo de hardware: no se pueden subir archivos nuevos.",
    );
  }
  const carpeta = limpiarCarpeta(datos.carpeta);
  if (carpeta === null) {
    throw new ErrorArchivo(
      `El nombre de la carpeta no vale (máximo ${MAXIMO_NIVELES_CARPETA} niveles, sin caracteres como : * ? < >).`,
    );
  }
  if (contenido.length === 0) throw new ErrorArchivo("El archivo está vacío.");
  if (contenido.length > MAXIMO_BYTES_ARCHIVO) {
    throw new ErrorArchivo(`El archivo pesa más de ${MAXIMO_MB_ARCHIVO} MB.`);
  }
  const usados = await espacioUsado(duenoId);
  if (usados + contenido.length > CUOTA_BYTES_PERSONA) {
    throw new ErrorArchivo(
      `No queda sitio: el espacio ya ocupa ${tamanoLegible(usados)} de ${tamanoLegible(CUOTA_BYTES_PERSONA)}. Borra algo antes.`,
    );
  }

  // Nombre al azar en el almacén: nadie puede adivinarlo y dos archivos iguales no se pisan
  const clave = `hardware/${duenoId}/${Date.now().toString(36)}-${randomBytes(9).toString("hex")}`;
  const tipo = /^[\w.+-]+\/[\w.+-]+$/.test(datos.tipo) ? datos.tipo : "application/octet-stream";
  try {
    await guardarPrivado(clave, contenido, tipo);
  } catch (error) {
    if (error instanceof ErrorAlmacenPrivado) throw new ErrorArchivo(error.message);
    throw error;
  }
  try {
    return await db.archivoHardware.create({
      data: {
        duenoId,
        nombre: limpiarNombreArchivo(datos.nombre),
        carpeta,
        clave,
        tamano: contenido.length,
        tipo,
        subidoPorNombre: usuario.nombre,
      },
      select: { id: true, nombre: true },
    });
  } catch (error) {
    await borrarPrivado(clave).catch(() => {});
    throw error;
  }
}

/** Un archivo que esta persona puede ver, o null (no existe o no es de su espacio) */
async function archivoPermitido(usuario: UsuarioActual, id: string) {
  if (!esId(id)) return null;
  const archivo = await db.archivoHardware.findUnique({ where: { id } });
  return archivo && puedeUsarEspacio(usuario, archivo.duenoId) ? archivo : null;
}

/** Para descargar: nombre, tipo, tamaño y contenido. null si no existe o no tiene permiso */
export async function abrirArchivo(usuario: UsuarioActual, id: string) {
  const archivo = await archivoPermitido(usuario, id);
  if (!archivo) return null;
  const cuerpo = await leerPrivado(archivo.clave);
  return cuerpo ? { ...archivo, cuerpo } : null;
}

/** Borra un archivo (del almacén y de la lista). Devuelve el dueño, para refrescar su página */
export async function borrarArchivo(usuario: UsuarioActual, id: string) {
  const archivo = await archivoPermitido(usuario, id);
  if (!archivo) throw new ErrorArchivo("Ese archivo ya no existe.");
  try {
    await borrarPrivado(archivo.clave);
  } catch (error) {
    if (error instanceof ErrorAlmacenPrivado) throw new ErrorArchivo(error.message);
    throw error;
  }
  await db.archivoHardware.delete({ where: { id: archivo.id } });
  // Como en el ordenador: al borrar el último archivo, la carpeta se queda (vacía)
  if (archivo.carpeta) {
    await guardarRutas(archivo.duenoId, conCarpetasDeArriba([archivo.carpeta]));
  }
  return archivo.duenoId;
}
