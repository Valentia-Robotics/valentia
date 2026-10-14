/**
 * SESIÓN DEL USUARIO (comprobación segura)
 * Todas las páginas y acciones que necesitan saber quién eres usan estas funciones.
 * Además de leer la cookie, comprueban que el usuario sigue existiendo en la base de datos.
 */
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export interface UsuarioActual {
  id: string;
  nombre: string;
  email: string;
}

/** El usuario que ha iniciado sesión, o null. Solo devuelve los datos necesarios (nunca la contraseña). */
export const obtenerUsuario = cache(async (): Promise<UsuarioActual | null> => {
  const sesion = await auth();
  const id = sesion?.user?.id;
  if (!id) return null;
  return db.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true },
  });
});

/** Como obtenerUsuario, pero si no hay sesión manda a /login y después vuelve a "volver" */
export async function exigirUsuario(volver: string): Promise<UsuarioActual> {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(`/login?callbackUrl=${encodeURIComponent(volver)}`);
  return usuario;
}
