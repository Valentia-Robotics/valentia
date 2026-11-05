/**
 * SESIÓN DEL USUARIO (comprobación segura)
 * Todas las páginas y acciones que necesitan saber quién eres usan estas funciones.
 * Además de leer la cookie, comprueban que el usuario sigue existiendo en la base de datos
 * (y su rol, así que quitarle a alguien el rol de ADMIN tiene efecto al momento).
 */
import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import type { Rol } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export interface UsuarioActual {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

/** El usuario que ha iniciado sesión, o null. Solo devuelve los datos necesarios (nunca la contraseña). */
export const obtenerUsuario = cache(async (): Promise<UsuarioActual | null> => {
  const sesion = await auth();
  const id = sesion?.user?.id;
  if (!id) return null;
  return db.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true, rol: true },
  });
});

/** Como obtenerUsuario, pero si no hay sesión manda a /login y después vuelve a "volver" */
export async function exigirUsuario(volver: string): Promise<UsuarioActual> {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(`/login?callbackUrl=${encodeURIComponent(volver)}`);
  return usuario;
}

/**
 * Solo para el panel /admin. Se llama en CADA página y en CADA acción del panel.
 *   - Sin sesión → al login (y después vuelve).
 *   - Con sesión pero sin ser ADMIN → página 404, como si el panel no existiera.
 */
export async function exigirAdmin(volver = "/admin"): Promise<UsuarioActual> {
  const usuario = await exigirUsuario(volver);
  if (usuario.rol !== "ADMIN") notFound();
  return usuario;
}

/**
 * Solo para el panel /editor. Igual que exigirAdmin: se llama en CADA página.
 * Con sesión pero sin ser EDITOR → 404: para un cliente o un admin, esa zona no existe.
 */
export async function exigirEditor(volver = "/editor"): Promise<UsuarioActual> {
  const usuario = await exigirUsuario(volver);
  if (usuario.rol !== "EDITOR") notFound();
  return usuario;
}

/** Error que lanzan las acciones del panel cuando quien las llama no es ADMIN */
export class SinPermiso extends Error {
  constructor() {
    super("No tienes permiso para hacer esto.");
  }
}

/**
 * Versión para las ACCIONES del panel (botones y formularios que cambian datos).
 * Una acción se puede llamar desde fuera de la web, así que se comprueba siempre:
 * si no eres ADMIN, se detiene con un error y no cambia nada.
 */
export async function exigirAdminEnAccion(): Promise<UsuarioActual> {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "ADMIN") throw new SinPermiso();
  return usuario;
}

/** Lo mismo para las acciones del panel de editor */
export async function exigirEditorEnAccion(): Promise<UsuarioActual> {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "EDITOR") throw new SinPermiso();
  return usuario;
}
