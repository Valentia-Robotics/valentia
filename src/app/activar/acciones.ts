"use server";

import { redirect } from "next/navigation";
import { activarCodigo } from "@/lib/activacion";
import { FORMATO_CODIGO, normalizarCodigo } from "@/lib/codigos";
import { registrarIntento } from "@/lib/limite";
import { obtenerUsuario } from "@/lib/sesion";

export interface EstadoActivacion {
  mensaje?: string;
}

/** Botón "Activar mi curso": vincula el código al usuario y le lleva al curso */
export async function activar(
  _anterior: EstadoActivacion,
  formulario: FormData,
): Promise<EstadoActivacion> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { mensaje: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  if (!registrarIntento("activar", usuario.id)) {
    return { mensaje: "Demasiados intentos seguidos. Espera unos minutos." };
  }

  const codigo = normalizarCodigo(String(formulario.get("codigo") ?? ""));
  if (!FORMATO_CODIGO.test(codigo)) return { mensaje: "Ese código no tiene un formato válido." };

  const resultado = await activarCodigo(usuario.id, codigo);
  if (resultado.estado === "no-existe") return { mensaje: "No encontramos ese código." };
  if (resultado.estado === "usado") {
    return { mensaje: "Este código ya se ha usado en otra cuenta." };
  }
  // "redirect" debe ir fuera de cualquier try/catch
  redirect(`/cursos/${resultado.cursoSlug}?activado=${resultado.estado === "activado" ? 1 : 0}`);
}
