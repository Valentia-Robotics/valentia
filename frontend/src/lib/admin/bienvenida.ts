/**
 * PERSONAS REGISTRADAS CON UNA TARJETA DE BIENVENIDA (panel)
 * Lista de quién ha usado un código del kit de bienvenida, y borrado de esas cuentas.
 * Solo se borran cuentas «de bienvenida»: clientes sin pedidos ni códigos de otros kits.
 */
import "server-only";
import { SLUG_KIT_BIENVENIDA } from "@/config/bienvenida";
import { db, transaccion } from "@/lib/db";

interface DatosCuenta {
  rol: string;
  pedidos: number;
  /** Códigos usados de kits que NO son el de bienvenida */
  otrosCodigos: number;
}

/** Por qué no se puede borrar una cuenta desde aquí (null = sí se puede). Puro, para poder probarlo. */
export function motivoNoBorrar({ rol, pedidos, otrosCodigos }: DatosCuenta): string | null {
  if (rol !== "CLIENTE")
    return "Es una cuenta de administrador o de editor: no se borra desde aquí.";
  if (pedidos > 0) return "Tiene pedidos en la tienda: no se borra para no perderlos.";
  if (otrosCodigos > 0)
    return "Ha activado el código de un kit: no es solo una cuenta de bienvenida.";
  return null;
}

async function idKitBienvenida() {
  const kit = await db.kit.findUnique({
    where: { slug: SLUG_KIT_BIENVENIDA },
    select: { id: true },
  });
  return kit?.id ?? null;
}

/** Personas que han usado una tarjeta de bienvenida, las más recientes primero */
export async function listarRegistradosBienvenida() {
  const kitId = await idKitBienvenida();
  if (!kitId) return [];
  const codigos = await db.codigoActivacion.findMany({
    where: { kitId, usadoEn: { not: null }, usuarioId: { not: null } },
    orderBy: { usadoEn: "desc" },
    select: {
      id: true,
      codigo: true,
      usadoEn: true,
      usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          creadoEn: true,
          _count: { select: { pedidos: true } },
        },
      },
    },
  });
  const ids = codigos.flatMap((c) => (c.usuario ? [c.usuario.id] : []));
  // Códigos de otros kits que han usado estas personas
  const otros = await db.codigoActivacion.groupBy({
    by: ["usuarioId"],
    where: { usuarioId: { in: ids }, kitId: { not: kitId }, usadoEn: { not: null } },
    _count: { _all: true },
  });
  const otrosPor = new Map(otros.map((o) => [o.usuarioId, o._count._all]));
  return codigos.flatMap((c) => {
    if (!c.usuario) return [];
    const { _count, ...usuario } = c.usuario;
    return [
      {
        codigoId: c.id,
        codigo: c.codigo,
        usadoEn: c.usadoEn,
        usuario,
        motivoNoBorrar: motivoNoBorrar({
          rol: usuario.rol,
          pedidos: _count.pedidos,
          otrosCodigos: otrosPor.get(usuario.id) ?? 0,
        }),
      },
    ];
  });
}

export type ResultadoBorrado = { ok: true; email: string } | { ok: false; mensaje: string };

/**
 * Borra la cuenta de alguien que se registró con una tarjeta de bienvenida (todo o nada). Su tarjeta
 * vuelve a quedar libre (sirve otra vez y deja de contar como registro). Su progreso, dispositivos y
 * demás datos personales se borran con la cuenta.
 */
export async function borrarUsuarioBienvenida(usuarioId: string): Promise<ResultadoBorrado> {
  const kitId = await idKitBienvenida();
  if (!kitId) return { ok: false, mensaje: "No existe el kit de bienvenida." };
  return transaccion(async (tx) => {
    const usuario = await tx.usuario.findUnique({
      where: { id: usuarioId },
      select: { email: true, rol: true, _count: { select: { pedidos: true } } },
    });
    if (!usuario) return { ok: false, mensaje: "Esta cuenta ya no existe." };
    // Una consulta detrás de otra: dentro de una transacción de MongoDB no conviene lanzarlas a la vez
    const deBienvenida = await tx.codigoActivacion.count({ where: { usuarioId, kitId } });
    const otrosCodigos = await tx.codigoActivacion.count({
      where: { usuarioId, kitId: { not: kitId }, usadoEn: { not: null } },
    });
    if (deBienvenida === 0)
      return { ok: false, mensaje: "Esta cuenta no se registró con una tarjeta de bienvenida." };
    const motivo = motivoNoBorrar({
      rol: usuario.rol,
      pedidos: usuario._count.pedidos,
      otrosCodigos,
    });
    if (motivo) return { ok: false, mensaje: motivo };

    await tx.codigoActivacion.updateMany({
      where: { usuarioId, kitId },
      data: { usadoEn: null, usuarioId: null },
    });
    await tx.usuario.delete({ where: { id: usuarioId } });
    return { ok: true, email: usuario.email };
  });
}
