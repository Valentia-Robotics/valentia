/**
 * SUBIR UN ARCHIVO A UN ESPACIO DE HARDWARE: POST /api/hardware/archivos?dueno=<id>&carpeta=<texto>
 * El cuerpo es el archivo tal cual (no un formulario) y su nombre va en la cabecera x-nombre-archivo
 * (codificado con encodeURIComponent). Lo usa el botón «Subir archivos» (SubirArchivos.tsx).
 * Va por /api para no pasar por el proxy (que corta los cuerpos grandes).
 */
import { tieneAccesoAdmin } from "@/config/equipo";
import { revalidatePath } from "next/cache";
import { MAXIMO_BYTES_ARCHIVO, MAXIMO_MB_ARCHIVO } from "@/config/hardware";
import { leerBytes } from "@/lib/cuerpoLimitado";
import { ErrorArchivo, subirArchivo } from "@/lib/hardware/archivos";
import { registrarIntento } from "@/lib/limite";
import { mismoSitio } from "@/lib/mismoSitio";
import { obtenerUsuario } from "@/lib/sesion";

const respuesta = (cuerpo: object, status: number) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(peticion: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario || (usuario.rol !== "HARDWARE" && !tieneAccesoAdmin(usuario.rol))) {
    return respuesta({ error: "No encontrado" }, 404);
  }
  if (!mismoSitio(peticion)) return respuesta({ error: "No permitido" }, 403);
  if (!(await registrarIntento("hardwareSubida", usuario.id))) {
    return respuesta({ error: "Has subido demasiados archivos seguidos. Espera un rato." }, 429);
  }

  const parametros = new URL(peticion.url).searchParams;
  let nombre: string;
  try {
    nombre = decodeURIComponent(peticion.headers.get("x-nombre-archivo") ?? "");
  } catch {
    return respuesta({ error: "El nombre del archivo no es válido." }, 400);
  }

  const contenido = await leerBytes(peticion, MAXIMO_BYTES_ARCHIVO);
  if (!contenido)
    return respuesta({ error: `El archivo pesa más de ${MAXIMO_MB_ARCHIVO} MB.` }, 413);

  try {
    const archivo = await subirArchivo({
      usuario,
      // Alguien de hardware solo sube a su espacio; un admin dice a cuál (sin decirlo, al suyo:
      // un admin con «también hardware» sube desde /hardware)
      duenoId: usuario.rol === "HARDWARE" ? usuario.id : parametros.get("dueno") || usuario.id,
      nombre,
      carpeta: parametros.get("carpeta") ?? "",
      tipo: peticion.headers.get("content-type") ?? "",
      contenido,
    });
    revalidatePath("/hardware");
    revalidatePath("/admin/hardware", "layout");
    return respuesta(
      { ok: true, id: archivo.id, nombre: archivo.nombre, repetido: archivo.repetido },
      archivo.repetido ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof ErrorArchivo) return respuesta({ error: error.message }, 400);
    console.error("[hardware] No se ha podido subir un archivo.", error);
    return respuesta({ error: "No se ha podido guardar el archivo. Vuelve a probar." }, 500);
  }
}
