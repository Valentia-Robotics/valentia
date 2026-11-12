"use server";

/**
 * ACCIONES DEL PANEL: CORREOS DE NOVEDADES (ADMIN y SIGMA)
 *   - Mandarme una prueba (solo a quien la pide)
 *   - Enviar a todos los que quieren recibirlas (src/config/novedades.ts)
 *   - Seguir enviando uno que se cortó a medias
 */
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { esquemaCorreoNovedades } from "@/config/novedades";
import { conErrores, texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { enviarCorreo } from "@/lib/correo";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { registrarIntento } from "@/lib/limite";
import { correoPara, crearCorreoNovedades, mandarPendientes } from "@/lib/novedades/novedades";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { plural } from "@/lib/utils";

function leer(formulario: FormData) {
  return esquemaCorreoNovedades.safeParse({
    asunto: texto(formulario, "asunto"),
    titulo: texto(formulario, "titulo"),
    texto: texto(formulario, "texto"),
    botonTexto: texto(formulario, "botonTexto"),
    botonUrl: texto(formulario, "botonUrl"),
  });
}

/** «Mandarme una prueba»: llega solo a tu correo, tal cual lo verán los clientes */
export async function enviarPrueba(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const yo = await exigirAdminEnAccion();
  const datos = leer(formulario);
  if (!datos.success) return conErrores(datos.error);
  if (!(await registrarIntento("correoNovedadesPrueba", yo.id))) {
    return { ok: false, mensaje: "Has mandado muchas pruebas seguidas. Espera un rato." };
  }
  const correo = correoPara(datos.data, yo);
  correo.asunto = `[Prueba] ${correo.asunto}`;
  const ok = await enviarCorreo(correo);
  return ok
    ? { ok: true, mensaje: `Prueba enviada a ${yo.email}. Mira tu bandeja de entrada.` }
    : { ok: false, mensaje: "El servicio de correo no ha aceptado la prueba. Inténtalo otra vez." };
}

/** «Enviar»: se guarda y los correos salen poco a poco (la lista de abajo enseña cómo va) */
export async function enviarNovedades(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const yo = await exigirAdminEnAccion();
  const datos = leer(formulario);
  if (!datos.success) return conErrores(datos.error);
  if (!(await registrarIntento("correoNovedades", yo.id))) {
    return { ok: false, mensaje: "Ya se han mandado varios correos hoy. Espera un poco." };
  }
  const { id, total } = await crearCorreoNovedades(datos.data, yo.id);
  if (total === 0) {
    await db.correoNovedades.update({ where: { id }, data: { terminadoEn: new Date() } });
    revalidatePath("/admin/correos");
    return { ok: false, mensaje: "Todavía no hay nadie que quiera recibir novedades." };
  }
  after(() => mandarPendientes(id));
  revalidatePath("/admin/correos");
  return {
    ok: true,
    mensaje: `Enviando a ${plural(total, "persona", "personas")}. Abajo ves cómo va; puedes cerrar esta página.`,
  };
}

/** «Seguir enviando»: para uno que se cortó (p. ej., al publicar la web en mitad del envío) */
export async function seguirEnviando(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  if (!esId(id)) return { ok: false, mensaje: "No encontramos ese correo." };
  await db.correoNovedades.update({ where: { id }, data: { avanceEn: new Date() } });
  after(() => mandarPendientes(id));
  revalidatePath("/admin/correos");
  return { ok: true, mensaje: "Seguimos enviando a los que faltaban." };
}
