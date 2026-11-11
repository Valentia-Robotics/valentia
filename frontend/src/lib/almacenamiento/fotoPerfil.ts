/**
 * FOTOS DE PERFIL
 * Se guardan en la propia base de datos (colección FotoPerfil): una foto de perfil reducida pesa unos
 * 10 KB, así que no hace falta ningún almacén de archivos. La web las enseña en
 * /api/fotos-perfil/<id> y las ve todo el que tenga sesión (el equipo, en los mensajes).
 *
 * Historia: primero iban al disco del servidor, que en Render se vacía en cada publicación (la foto
 * desaparecía; quien la subió la seguía viendo por la copia de su navegador). Luego, al almacén
 * privado de R2 (/api/fotos-perfil/<nombre>.webp): esas siguen funcionando, pero las nuevas ya no
 * dependen de que el almacén esté bien configurado.
 */
import "server-only";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { borrarImagen, prepararImagen } from "./index";
import { borrarPrivado } from "./privado";

/** Dirección con la que la web enseña las fotos de perfil */
export const PREFIJO_FOTO_PERFIL = "/api/fotos-perfil/";
/** Lado de la foto, en píxeles (cuadrada). Se enseña a 44-80 px: 192 se ve nítida en pantallas retina */
export const LADO_FOTO_PERFIL = 192;

/** Lo que va tras /api/fotos-perfil/: un id de la BD (fotos nuevas) o un nombre del almacén privado (antiguas) */
export type FotoEnRuta = { tipo: "bd"; id: string } | { tipo: "almacen"; clave: string } | null;

export function leerRutaFoto(nombre: string): FotoEnRuta {
  if (esId(nombre)) return { tipo: "bd", id: nombre };
  // Las del almacén privado (11-11-2026): las crea nombreAlAzar(); nadie puede pedir otra ruta
  if (/^[a-z0-9]+-[a-f0-9]{12}\.webp$/.test(nombre))
    return { tipo: "almacen", clave: `perfiles/${nombre}` };
  return null;
}

/** Recorta la foto, la guarda y devuelve su dirección para Usuario.foto */
export async function subirFotoPerfil(usuarioId: string, archivo: File): Promise<string> {
  const datos = await prepararImagen(archivo, { cuadrada: LADO_FOTO_PERFIL, calidad: 80 });
  const foto = await db.fotoPerfil.create({
    data: { usuarioId, datos: new Uint8Array(datos) },
    select: { id: true },
  });
  return PREFIJO_FOTO_PERFIL + foto.id;
}

/** Borra una foto de perfil, esté donde esté guardada */
export async function borrarFotoPerfil(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (!url.startsWith(PREFIJO_FOTO_PERFIL)) return borrarImagen(url); // las del disco (antes del 11-11-2026)
  const ruta = leerRutaFoto(url.slice(PREFIJO_FOTO_PERFIL.length));
  if (ruta?.tipo === "bd") await db.fotoPerfil.deleteMany({ where: { id: ruta.id } });
  if (ruta?.tipo === "almacen") await borrarPrivado(ruta.clave);
}
