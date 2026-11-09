"use server";

/**
 * ACCIONES DEL PANEL: BLOG
 * Cada acción comprueba primero que quien la llama es ADMIN.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { texto, casilla, type EstadoFormulario } from "@/lib/admin/formularios";
import {
  actualizarArticulo,
  crearArticulo,
  despublicarArticulo,
  guardarAjustes,
  ponerEnCola,
  publicarArticulo,
  rechazarArticulo,
} from "@/lib/blog/articulos";
import { minutosDeHora } from "@/lib/blog/cola";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { leerArticulo } from "@/lib/validaciones/articulo";

const NO_ENCONTRADO: EstadoFormulario = { ok: false, mensaje: "No encontramos ese artículo." };

/** Los avisos de calidad no impiden guardar: el admin decide, pero los ve */
const conAvisos = (motivos: string[], hecho: string): EstadoFormulario => ({
  ok: true,
  mensaje: motivos.length
    ? `${hecho} Ojo: ${motivos.join(" ")}`
    : `${hecho} Pasa todos los filtros de calidad.`,
});

/** Crear (sin articuloId) o editar (con articuloId) */
export async function guardarArticuloAdmin(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirAdminEnAccion();
  const id = texto(formulario, "articuloId");
  if (id && !esId(id)) return NO_ENCONTRADO;
  const { datos, error } = leerArticulo(formulario);
  if (error) return error;

  if (!id) {
    const creado = await crearArticulo(datos, {
      origen: "MANUAL",
      autor: { id: admin.id, nombre: admin.nombre },
      siPasa: "PENDIENTE",
    });
    redirect(`/admin/blog/${creado.id}?creado=1`);
  }
  const guardado = await actualizarArticulo(id, datos);
  if (!guardado) return NO_ENCONTRADO;
  revalidatePath("/admin/blog", "layout");
  return conAvisos(guardado.motivos, "Guardado.");
}

const ACCIONES = ["publicar", "cola", "rechazar", "despublicar"] as const;

export async function cambiarEstadoArticulo(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "articuloId");
  const accion = texto(formulario, "accion") as (typeof ACCIONES)[number];
  if (!esId(id) || !ACCIONES.includes(accion)) return NO_ENCONTRADO;
  const articulo = await db.articulo.findUnique({ where: { id }, select: { estado: true } });
  if (!articulo) return NO_ENCONTRADO;

  switch (accion) {
    case "publicar":
      if (articulo.estado === "PUBLICADO") return { ok: false, mensaje: "Ya está publicado." };
      await publicarArticulo(id);
      break;
    case "cola":
      if (articulo.estado === "PUBLICADO") return { ok: false, mensaje: "Ya está publicado." };
      await ponerEnCola(id);
      break;
    case "rechazar":
      await rechazarArticulo(id, texto(formulario, "motivo").trim().slice(0, 500));
      break;
    case "despublicar":
      if (articulo.estado !== "PUBLICADO") return { ok: false, mensaje: "No está publicado." };
      await despublicarArticulo(id);
      break;
  }
  revalidatePath("/admin/blog", "layout");
  return { ok: true, mensaje: "Hecho." };
}

export async function guardarAjustesBlog(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const porDia = Number(texto(formulario, "porDia"));
  const hora = texto(formulario, "hora");
  if (!Number.isInteger(porDia) || porDia < 1 || porDia > 10) {
    return { ok: false, mensaje: "Entre 1 y 10 artículos al día.", errores: { porDia: "Entre 1 y 10" } };
  }
  if (!/^\d{2}:\d{2}$/.test(hora) || minutosDeHora(hora) !== Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3))) {
    return { ok: false, mensaje: "La hora no es válida.", errores: { hora: "Hora no válida" } };
  }
  await guardarAjustes({ autoPublicar: casilla(formulario, "autoPublicar"), porDia, hora });
  revalidatePath("/admin/blog", "layout");
  return { ok: true, mensaje: "Ajustes guardados." };
}
