/**
 * FOTOS DE PERFIL
 * Se guardan en el almacén PRIVADO (el mismo de las imágenes del chat y los archivos de hardware:
 * en la web publicada, un bucket de Cloudflare R2) y la web las enseña en /api/fotos-perfil/<nombre>.
 *
 * Antes iban al almacén de las fotos del panel, que en Render es el disco del servidor: ese disco se
 * vacía en cada publicación, así que la foto desaparecía a las pocas horas. Quien la había subido la
 * seguía viendo (su navegador la tenía guardada), pero los demás no.
 */
import "server-only";
import { borrarImagen, nombreAlAzar, prepararImagen } from "./index";
import { borrarPrivado, guardarPrivado } from "./privado";

/** Dirección con la que la web enseña las fotos de perfil */
export const PREFIJO_FOTO_PERFIL = "/api/fotos-perfil/";
/** Carpeta dentro del almacén privado */
const CARPETA = "perfiles";
/** Lado de la foto, en píxeles (cuadrada) */
const LADO = 256;

/** Nombre válido de una foto de perfil (lo crea nombreAlAzar): así nadie pide otra ruta del almacén */
export function claveFotoPerfil(nombre: string): string | null {
  return /^[a-z0-9]+-[a-f0-9]{12}\.webp$/.test(nombre) ? `${CARPETA}/${nombre}` : null;
}

/** Recorta la foto, la guarda y devuelve su dirección para Usuario.foto */
export async function subirFotoPerfil(archivo: File): Promise<string> {
  const datos = await prepararImagen(archivo, { cuadrada: LADO });
  const nombre = nombreAlAzar();
  await guardarPrivado(`${CARPETA}/${nombre}`, datos, "image/webp");
  return PREFIJO_FOTO_PERFIL + nombre;
}

/** Borra una foto de perfil (también las antiguas, guardadas con el almacén de fotos) */
export async function borrarFotoPerfil(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (url.startsWith(PREFIJO_FOTO_PERFIL)) {
    const clave = claveFotoPerfil(url.slice(PREFIJO_FOTO_PERFIL.length));
    if (clave) await borrarPrivado(clave);
    return;
  }
  await borrarImagen(url);
}
