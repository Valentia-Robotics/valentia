"use server";

/**
 * ACCIONES DEL PANEL: USUARIOS
 * Dar o quitar el rol de editor. Desde aquí nadie gana ni pierde el rol de administrador.
 */
import { revalidatePath } from "next/cache";
import { ESTADOS_ACTIVOS } from "@/config/estadosGuion";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { DIAS_CONFIANZA } from "@/lib/verificacion/reglas";

export async function cambiarRolEditor(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const usuarioId = texto(formulario, "usuarioId");
  const hacerEditor = texto(formulario, "hacerEditor") === "si";
  if (!esId(usuarioId)) return { ok: false, mensaje: "No encontramos esa cuenta." };

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { rol: true, emailVerificadoEn: true },
  });
  if (!usuario) return { ok: false, mensaje: "No encontramos esa cuenta." };
  if (usuario.rol === "ADMIN") {
    return { ok: false, mensaje: "Una cuenta de administrador no se cambia desde aquí." };
  }

  if (hacerEditor) {
    if (!usuario.emailVerificadoEn) {
      return { ok: false, mensaje: "Esta cuenta todavía no ha confirmado su email." };
    }
    await db.usuario.updateMany({
      where: { id: usuarioId, rol: "CLIENTE" },
      data: { rol: "EDITOR" },
    });
    // Nuevo EDITOR: su confianza en cada dispositivo dura menos (src/lib/verificacion/reglas.ts)
    const dias = DIAS_CONFIANZA.EDITOR * 24 * 60 * 60_000;
    const dispositivos = await db.dispositivoConfianza.findMany({ where: { usuarioId } });
    for (const d of dispositivos) {
      const maximo = new Date(d.creadoEn.getTime() + dias);
      if (d.caducaEn > maximo) {
        await db.dispositivoConfianza.update({ where: { id: d.id }, data: { caducaEn: maximo } });
      }
    }
  } else {
    const activos = await db.guion.count({
      where: { editorId: usuarioId, estado: { in: ESTADOS_ACTIVOS } },
    });
    if (activos > 0) {
      return {
        ok: false,
        mensaje: `Tiene ${activos} ${activos === 1 ? "guion activo" : "guiones activos"}: termínalos o pásalos a otro editor antes.`,
      };
    }
    await db.usuario.updateMany({
      where: { id: usuarioId, rol: "EDITOR" },
      data: { rol: "CLIENTE" },
    });
  }

  revalidatePath("/admin/usuarios");
  return { ok: true };
}
