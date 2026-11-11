/**
 * EL EQUIPO: los roles que trabajan en la web (no los clientes). De ellos se apunta la última
 * conexión y salen en /admin/empleados (y primero en /admin/usuarios). Rol nuevo de trabajador → añadirlo al enum Rol
 * del esquema y aquí: aparece solo en Empleados.
 */
import type { Rol } from "@/generated/prisma/enums";

export const ROLES_EQUIPO: { rol: Rol; nombre: string; femenino: string; plural: string }[] = [
  { rol: "ADMIN", nombre: "Administrador", femenino: "Administradora", plural: "Administración" },
  { rol: "EDITOR", nombre: "Editor", femenino: "Editora", plural: "Editores" },
  { rol: "HARDWARE", nombre: "Hardware", femenino: "Hardware", plural: "Hardware" },
];

export const esDelEquipo = (rol: Rol) => ROLES_EQUIPO.some((r) => r.rol === rol);

/**
 * El nombre del puesto como se enseña: «Editor» o «Editora», según lo que se haya elegido para esa
 * persona (Usuario.rolFemenino). Un cliente no tiene puesto: devuelve "Cliente".
 */
export function nombreRol(rol: Rol, femenino?: boolean | null): string {
  const datos = ROLES_EQUIPO.find((r) => r.rol === rol);
  if (!datos) return "Cliente";
  return femenino ? datos.femenino : datos.nombre;
}

/** «Editor» o «Editora» (para quien también edita siendo admin) */
export const nombreEditor = (femenino?: boolean | null) => nombreRol("EDITOR", femenino);

/**
 * Quién trabaja como editor (tiene «Mis guiones» y se le pueden asignar guiones): el rol EDITOR y
 * los ADMIN que también editan (Usuario.tambienEditor, se marca en /admin/usuarios).
 */
export function puedeEditarGuiones(usuario: { rol: Rol; tambienEditor?: boolean | null }) {
  return usuario.rol === "EDITOR" || (usuario.rol === "ADMIN" && !!usuario.tambienEditor);
}

/** Lo mismo como filtro de la base de datos (para listar a quién se puede asignar un guion) */
export const FILTRO_EDITORES = {
  OR: [{ rol: "EDITOR" as const }, { rol: "ADMIN" as const, tambienEditor: true }],
};

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
