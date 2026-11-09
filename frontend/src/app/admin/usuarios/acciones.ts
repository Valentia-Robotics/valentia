"use server";

/**
 * ACCIONES DEL PANEL: USUARIOS
 * Dar o quitar los roles de trabajo (editor, hardware). Una persona tiene un solo rol: para pasar
 * de editor a hardware, primero se le quita. Desde aquí nadie gana ni pierde el rol de administrador.
 */
import { revalidatePath } from "next/cache";
import { ESTADOS_ACTIVOS } from "@/config/estadosGuion";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { DIAS_CONFIANZA } from "@/lib/verificacion/reglas";

/** Roles que se dan y se quitan desde Usuarios */
const ROLES_ASIGNABLES = ["EDITOR", "HARDWARE"] as const;
type RolAsignable = (typeof ROLES_ASIGNABLES)[number];

/**
 * Datos del formulario: usuarioId, rol ("EDITOR" | "HARDWARE") y dar ("si" para darlo, "no" para
 * quitarlo y que vuelva a ser cliente).
 */
export async function cambiarRolTrabajo(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const usuarioId = texto(formulario, "usuarioId");
  const rol = texto(formulario, "rol") as RolAsignable;
  const dar = texto(formulario, "dar") === "si";
  if (!esId(usuarioId)) return { ok: false, mensaje: "No encontramos esa cuenta." };
  if (!ROLES_ASIGNABLES.includes(rol)) return { ok: false, mensaje: "Ese rol no existe." };

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { rol: true, emailVerificadoEn: true },
  });
  if (!usuario) return { ok: false, mensaje: "No encontramos esa cuenta." };
  if (usuario.rol === "ADMIN") {
    return { ok: false, mensaje: "Una cuenta de administrador no se cambia desde aquí." };
  }

  if (dar) {
    if (!usuario.emailVerificadoEn) {
      return { ok: false, mensaje: "Esta cuenta todavía no ha confirmado su email." };
    }
    if (usuario.rol !== "CLIENTE") {
      return { ok: false, mensaje: "Ya tiene otro rol: quítaselo antes de darle este." };
    }
    await db.usuario.updateMany({ where: { id: usuarioId, rol: "CLIENTE" }, data: { rol } });
    // Rol de trabajo: su confianza en cada dispositivo dura menos (src/lib/verificacion/reglas.ts)
    const dias = DIAS_CONFIANZA[rol] * 24 * 60 * 60_000;
    const dispositivos = await db.dispositivoConfianza.findMany({ where: { usuarioId } });
    for (const d of dispositivos) {
      const maximo = new Date(d.creadoEn.getTime() + dias);
      if (d.caducaEn > maximo) {
        await db.dispositivoConfianza.update({ where: { id: d.id }, data: { caducaEn: maximo } });
      }
    }
  } else {
    if (rol === "EDITOR") {
      const activos = await db.guion.count({
        where: { editorId: usuarioId, estado: { in: ESTADOS_ACTIVOS } },
      });
      if (activos > 0) {
        return {
          ok: false,
          mensaje: `Tiene ${activos} ${activos === 1 ? "guion activo" : "guiones activos"}: termínalos o pásalos a otro editor antes.`,
        };
      }
    }
    // Hardware: sus archivos se quedan; la administración los sigue viendo en /admin/hardware
    await db.usuario.updateMany({ where: { id: usuarioId, rol }, data: { rol: "CLIENTE" } });
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/hardware", "layout");
  return { ok: true };
}
