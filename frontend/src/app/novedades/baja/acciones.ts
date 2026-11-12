"use server";

/** DARSE DE BAJA DE LAS NOVEDADES (botón de /novedades/baja; no hace falta iniciar sesión) */
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { firmaBajaValida } from "@/lib/novedades/baja";
import { guardarPreferenciaNovedades } from "@/lib/novedades/novedades";

export async function confirmarBaja(formulario: FormData) {
  const u = formulario.get("u");
  const t = formulario.get("t");
  if (!esId(u) || typeof t !== "string" || !firmaBajaValida(u, t)) redirect("/novedades/baja");
  if (await db.usuario.findUnique({ where: { id: u }, select: { id: true } })) {
    await guardarPreferenciaNovedades(u, false);
  }
  redirect(`/novedades/baja?u=${u}&t=${encodeURIComponent(t)}&hecho=1`);
}
