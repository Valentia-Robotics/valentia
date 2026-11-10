/**
 * EL EQUIPO: los roles que trabajan en la web (no los clientes). De ellos se apunta la última
 * conexión y salen en /admin/empleados (y primero en /admin/usuarios). Rol nuevo de trabajador → añadirlo al enum Rol
 * del esquema y aquí: aparece solo en Empleados.
 */
import type { Rol } from "@/generated/prisma/enums";

export const ROLES_EQUIPO: { rol: Rol; nombre: string; plural: string }[] = [
  { rol: "ADMIN", nombre: "Administrador", plural: "Administración" },
  { rol: "EDITOR", nombre: "Editor", plural: "Editores" },
  { rol: "HARDWARE", nombre: "Hardware", plural: "Hardware" },
];

export const esDelEquipo = (rol: Rol) => ROLES_EQUIPO.some((r) => r.rol === rol);

/**
 * Quién puede gestionar el CATÁLOGO del panel (/admin/componentes y /admin/kits): crear, editar,
 * ocultar, publicar y borrar piezas y kits. Hardware también (petición del usuario, 10-11-2026);
 * el resto del panel sigue siendo solo de ADMIN.
 */
export const ROLES_CATALOGO: Rol[] = ["ADMIN", "HARDWARE"];
export const puedeGestionarCatalogo = (rol: Rol) => ROLES_CATALOGO.includes(rol);

/** Cada cuánto se apunta, como mucho, la última conexión (para no escribir en la BD en cada clic) */
export const MINUTOS_ENTRE_CONEXIONES = 2;

/** Con actividad en estos últimos minutos, sale «Conectado ahora» */
export const MINUTOS_EN_LINEA = 5;

const zona = "Europe/Madrid";
const hora = new Intl.DateTimeFormat("es-ES", { timeStyle: "short", timeZone: zona });
const dia = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: zona });
const diaClave = new Intl.DateTimeFormat("en-CA", { timeZone: zona }); // 2026-11-09

/**
 * La última conexión dicha como la diría una persona, en hora de España:
 * «Conectado ahora», «Hace 12 min», «Hoy a las 10:32», «Ayer a las 18:05», «3 nov 2026 a las 9:15».
 */
export function textoConexion(ultima: Date | null, ahora = new Date()): string {
  if (!ultima) return "Nunca (desde que se apunta)";
  const minutos = Math.floor((ahora.getTime() - ultima.getTime()) / 60_000);
  if (minutos < MINUTOS_EN_LINEA) return "Conectado ahora";
  if (minutos < 60) return `Hace ${minutos} min`;
  const ayer = new Date(ahora.getTime() - 86_400_000);
  const cuando = diaClave.format(ultima);
  if (cuando === diaClave.format(ahora)) return `Hoy a las ${hora.format(ultima)}`;
  if (cuando === diaClave.format(ayer)) return `Ayer a las ${hora.format(ultima)}`;
  return `${dia.format(ultima)} a las ${hora.format(ultima)}`;
}

export const enLinea = (ultima: Date | null, ahora = new Date()) =>
  !!ultima && ahora.getTime() - ultima.getTime() < MINUTOS_EN_LINEA * 60_000;
