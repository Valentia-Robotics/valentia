/**
 * SESIÓN DE LA APP DEL MÓVIL
 * La app no usa cookies: después de escribir el código del email recibe un token largo y al azar,
 * lo guarda en el almacén seguro del móvil y lo manda en cada petición (Authorization: Bearer …).
 *
 * Cada móvil es un «dispositivo de confianza» más (la misma tabla que los navegadores), así que
 * sale en «Mis dispositivos» de la web y se puede cerrar desde allí. En la base de datos solo se
 * guarda la huella del token. La sesión dura DIAS_SESION_APP días y se alarga al usarla.
 */
import "server-only";
import { DIAS_SESION_APP } from "@/config/app";
import { db } from "@/lib/db";
import { generarToken, hashToken } from "@/lib/verificacion/cripto";
import { MINUTOS_ENTRE_USOS } from "@/lib/verificacion/reglas";

const DIA = 24 * 60 * 60_000;
const PREFIJO = "Bearer ";

/** Nombre del dispositivo que se ve en «Mis dispositivos» */
export function nombreMovil(sistema: unknown): string {
  if (sistema === "ios") return "App Valentia en iPhone";
  if (sistema === "android") return "App Valentia en Android";
  return "App Valentia";
}

/** Crea la sesión de un móvil y devuelve su token (solo se entrega una vez: no se puede recuperar) */
export async function crearSesionApp(usuarioId: string, nombre: string) {
  const token = generarToken();
  const dispositivo = await db.dispositivoConfianza.create({
    data: {
      usuarioId,
      tokenHash: hashToken(token),
      nombre,
      caducaEn: new Date(Date.now() + DIAS_SESION_APP * DIA),
    },
    select: { id: true, nombre: true },
  });
  return { token, dispositivo };
}

function tokenDe(peticion: Request): string | null {
  const cabecera = peticion.headers.get("authorization") ?? "";
  if (!cabecera.startsWith(PREFIJO)) return null;
  const token = cabecera.slice(PREFIJO.length).trim();
  // generarToken da 43 caracteres base64url; cualquier otra cosa no es nuestra
  return /^[A-Za-z0-9_-]{20,100}$/.test(token) ? token : null;
}

export interface UsuarioApp {
  id: string;
  nombre: string;
  email: string;
  dispositivoId: string;
}

/**
 * El usuario de la petición (o null): token válido, sin caducar, email verificado y sin
 * «Cerrar sesión». Alarga la sesión como mucho una vez por hora.
 */
export async function usuarioDeLaApp(peticion: Request): Promise<UsuarioApp | null> {
  const token = tokenDe(peticion);
  if (!token) return null;
  const dispositivo = await db.dispositivoConfianza.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      caducaEn: true,
      ultimoUsoEn: true,
      sesionCerradaEn: true,
      usuario: { select: { id: true, nombre: true, email: true, emailVerificadoEn: true } },
    },
  });
  const ahora = Date.now();
  if (
    !dispositivo ||
    dispositivo.caducaEn.getTime() < ahora ||
    dispositivo.sesionCerradaEn ||
    !dispositivo.usuario.emailVerificadoEn
  ) {
    return null;
  }

  if (dispositivo.ultimoUsoEn.getTime() < ahora - MINUTOS_ENTRE_USOS * 60_000) {
    await db.dispositivoConfianza.update({
      where: { id: dispositivo.id },
      data: { ultimoUsoEn: new Date(ahora), caducaEn: new Date(ahora + DIAS_SESION_APP * DIA) },
    });
  }
  const { id, nombre, email } = dispositivo.usuario;
  return { id, nombre, email, dispositivoId: dispositivo.id };
}

/** «Cerrar sesión» en la app: el móvil deja de ser de confianza (el token ya no vale) */
export async function cerrarSesionApp(usuario: UsuarioApp) {
  await db.dispositivoConfianza.deleteMany({
    where: { id: usuario.dispositivoId, usuarioId: usuario.id },
  });
}
