/**
 * ACTIVACIÓN DE KITS
 * Un código de activación (el del QR de la caja) desbloquea el curso de su kit
 * para el usuario que lo activa. Cada código solo se puede usar una vez.
 */
import "server-only";
import { db, transaccion } from "@/lib/db";

/** Datos de un código para enseñarlo en /activar (o null si no existe) */
export function buscarCodigo(codigo: string) {
  return db.codigoActivacion.findUnique({
    where: { codigo },
    select: {
      codigo: true,
      usadoEn: true,
      usuarioId: true,
      desactivadoEn: true,
      kit: {
        select: {
          nombre: true,
          imagen: true,
          curso: { select: { id: true, slug: true, titulo: true, descripcion: true } },
        },
      },
    },
  });
}

export type ResultadoActivacion =
  | { estado: "activado"; cursoSlug: string }
  /** Ya tenía el curso: el código NO se gasta, para que pueda regalarlo */
  | { estado: "ya-tienes"; cursoSlug: string }
  | { estado: "usado" }
  /** Desactivado desde el panel: ya no sirve */
  | { estado: "desactivado" }
  | { estado: "no-existe" };

/** Activa un código para un usuario. Todo o nada (transacción). */
export async function activarCodigo(
  usuarioId: string,
  codigo: string,
): Promise<ResultadoActivacion> {
  return transaccion(async (tx) => {
    const encontrado = await tx.codigoActivacion.findUnique({
      where: { codigo },
      select: {
        usadoEn: true,
        usuarioId: true,
        desactivadoEn: true,
        kit: { select: { cursoId: true, curso: { select: { slug: true } } } },
      },
    });
    if (!encontrado) return { estado: "no-existe" };

    const { cursoId, curso } = encontrado.kit;
    // Si lo activó él mismo antes, simplemente le llevamos a su curso
    if (encontrado.usadoEn && encontrado.usuarioId === usuarioId) {
      return { estado: "ya-tienes", cursoSlug: curso.slug };
    }
    if (encontrado.usadoEn) return { estado: "usado" };
    if (encontrado.desactivadoEn) return { estado: "desactivado" };

    const yaTiene = await tx.cursoUsuario.findUnique({
      where: { usuarioId_cursoId: { usuarioId, cursoId } },
    });
    if (yaTiene) return { estado: "ya-tienes", cursoSlug: curso.slug };

    // Marcamos el código como usado SOLO si nadie lo ha usado mientras tanto
    const marcado = await tx.codigoActivacion.updateMany({
      where: { codigo, usadoEn: null, desactivadoEn: null },
      data: { usadoEn: new Date(), usuarioId },
    });
    if (marcado.count === 0) return { estado: "usado" };

    await tx.cursoUsuario.create({ data: { usuarioId, cursoId } });
    return { estado: "activado", cursoSlug: curso.slug };
  });
}
