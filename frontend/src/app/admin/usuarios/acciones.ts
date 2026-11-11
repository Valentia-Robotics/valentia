"use server";

/**
 * ACCIONES DEL PANEL: USUARIOS
 * Dar o quitar los roles de trabajo (editor, hardware, sigma). Una persona tiene un solo rol: para
 * pasar de editor a hardware, primero se le quita. Desde aquí nadie gana ni pierde el rol de
 * administrador, pero a un administrador sí se le puede dar «también editor» (Usuario.tambienEditor).
 * SIGMA tiene los accesos de un administrador, pero por debajo: solo un ADMIN da o quita ese rol, y
 * un SIGMA no cambia nada de las cuentas de administración (ADMIN u otro SIGMA), salvo lo suyo.
 * Cada puesto se puede decir en masculino o en femenino («Editor» / «Editora»): Usuario.rolFemenino.
 */
import { revalidatePath } from "next/cache";
import { esJefe, tieneAccesoAdmin } from "@/config/equipo";
import { ESTADOS_ACTIVOS } from "@/config/estadosGuion";
import type { Rol } from "@/generated/prisma/enums";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { DIAS_CONFIANZA } from "@/lib/verificacion/reglas";

/** Roles que se dan y se quitan desde Usuarios */
const ROLES_ASIGNABLES = ["EDITOR", "HARDWARE", "SIGMA"] as const;
type RolAsignable = (typeof ROLES_ASIGNABLES)[number];

const NO_ENCONTRADA: EstadoFormulario = { ok: false, mensaje: "No encontramos esa cuenta." };

const SOLO_ADMIN: EstadoFormulario = {
  ok: false,
  mensaje: "Las cuentas de administración solo las cambia un administrador.",
};

/**
 * ¿Puede «yo» tocar la cuenta de otra persona? Un ADMIN, cualquiera. Un SIGMA, las que no son de
 * administración y la suya propia (por ejemplo, «también editor» o cómo se dice su puesto).
 */
function puedeTocar(yo: { id: string; rol: Rol }, otra: { id: string; rol: Rol }) {
  return esJefe(yo.rol) || !tieneAccesoAdmin(otra.rol) || yo.id === otra.id;
}

/** Con guiones a medias no se deja de ser editor: antes hay que terminarlos o pasarlos a otro */
async function avisoGuionesActivos(usuarioId: string): Promise<EstadoFormulario | null> {
  const activos = await db.guion.count({
    where: { editorId: usuarioId, estado: { in: ESTADOS_ACTIVOS } },
  });
  if (activos === 0) return null;
  return {
    ok: false,
    mensaje: `Tiene ${activos} ${activos === 1 ? "guion activo" : "guiones activos"}: termínalos o pásalos a otro editor antes.`,
  };
}

function refrescar() {
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/empleados");
  revalidatePath("/admin/contenido", "layout");
  revalidatePath("/admin/hardware", "layout");
}

/**
 * Datos del formulario: usuarioId, rol ("EDITOR" | "HARDWARE"), dar ("si" para darlo, "no" para
 * quitarlo y que vuelva a ser cliente) y, al darlo, femenino ("si" = «Editora»).
 */
export async function cambiarRolTrabajo(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const yo = await exigirAdminEnAccion();
  const usuarioId = texto(formulario, "usuarioId");
  const rol = texto(formulario, "rol") as RolAsignable;
  const dar = texto(formulario, "dar") === "si";
  const femenino = texto(formulario, "femenino") === "si";
  if (!esId(usuarioId)) return NO_ENCONTRADA;
  if (!ROLES_ASIGNABLES.includes(rol)) return { ok: false, mensaje: "Ese rol no existe." };
  // SIGMA lo da y lo quita solo un ADMIN
  if (rol === "SIGMA" && !esJefe(yo.rol)) return SOLO_ADMIN;

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { rol: true, emailVerificadoEn: true },
  });
  if (!usuario) return NO_ENCONTRADA;
  if (usuario.rol === "ADMIN") {
    return { ok: false, mensaje: "Una cuenta de administrador no se cambia desde aquí." };
  }
  if (usuario.rol === "SIGMA" && (rol !== "SIGMA" || !esJefe(yo.rol))) return SOLO_ADMIN;

  if (dar) {
    if (!usuario.emailVerificadoEn) {
      return { ok: false, mensaje: "Esta cuenta todavía no ha confirmado su email." };
    }
    if (usuario.rol !== "CLIENTE") {
      return { ok: false, mensaje: "Ya tiene otro rol: quítaselo antes de darle este." };
    }
    await db.usuario.updateMany({
      where: { id: usuarioId, rol: "CLIENTE" },
      data: { rol, rolFemenino: femenino },
    });
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
    // Editor, o sigma que también editaba: con guiones a medias no se quita
    if (rol === "EDITOR" || rol === "SIGMA") {
      const aviso = await avisoGuionesActivos(usuarioId);
      if (aviso) return aviso;
    }
    // Hardware: sus archivos se quedan; la administración los sigue viendo en /admin/hardware
    await db.usuario.updateMany({
      where: { id: usuarioId, rol },
      data: { rol: "CLIENTE", tambienEditor: false },
    });
  }

  refrescar();
  return { ok: true };
}

/**
 * Un administrador que además trabaja como editor: tiene «Mis guiones» y se le pueden asignar
 * guiones. Datos: usuarioId, dar ("si" | "no") y, al darlo, femenino ("si" = «Editora»).
 */
export async function cambiarTambienEditor(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const yo = await exigirAdminEnAccion();
  const usuarioId = texto(formulario, "usuarioId");
  const dar = texto(formulario, "dar") === "si";
  if (!esId(usuarioId)) return NO_ENCONTRADA;

  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true },
  });
  if (!usuario) return NO_ENCONTRADA;
  if (!tieneAccesoAdmin(usuario.rol)) {
    return { ok: false, mensaje: "Solo a un administrador o sigma se le da «también editor»." };
  }
  if (!puedeTocar(yo, usuario)) return SOLO_ADMIN;
  if (!dar) {
    const aviso = await avisoGuionesActivos(usuarioId);
    if (aviso) return aviso;
  }
  await db.usuario.update({ where: { id: usuarioId }, data: { tambienEditor: dar } });
  refrescar();
  revalidatePath("/editor", "layout");
  return { ok: true };
}

/** Cómo se dice el puesto de alguien del equipo: femenino ("si") o masculino ("no") */
export async function cambiarFormaPuesto(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const yo = await exigirAdminEnAccion();
  const usuarioId = texto(formulario, "usuarioId");
  const femenino = texto(formulario, "femenino") === "si";
  if (!esId(usuarioId)) return NO_ENCONTRADA;
  const otra = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true },
  });
  if (!otra) return NO_ENCONTRADA;
  if (!puedeTocar(yo, otra)) return SOLO_ADMIN;
  const { count } = await db.usuario.updateMany({
    where: { id: usuarioId, rol: { not: "CLIENTE" } },
    data: { rolFemenino: femenino },
  });
  if (count === 0) return { ok: false, mensaje: "Esta cuenta no tiene un puesto de trabajo." };
  refrescar();
  return { ok: true };
}
