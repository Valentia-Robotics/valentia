/**
 * ABRIR LA SESIÓN
 * Cuando ya sabemos quién eres (contraseña correcta + dispositivo de confianza o código),
 * convertimos el dispositivo en una sesión de Auth.js con un "pase" de un solo uso.
 */
import "server-only";
import { signIn } from "@/auth";
import { crearPase } from "./dispositivos";

/** Inicia la sesión en este navegador. Devuelve false si algo ha fallado. */
export async function abrirSesion(dispositivoId: string): Promise<boolean> {
  const pase = await crearPase(dispositivoId);
  try {
    // redirect: false → solo crea la cookie de sesión; a dónde ir lo decide el navegador
    await signIn("credentials", { pase, redirect: false });
    return true;
  } catch (error) {
    console.error("No se ha podido abrir la sesión:", error);
    return false;
  }
}
