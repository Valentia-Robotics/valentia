/**
 * BORRAR PEDIDOS (panel). Solo los de prueba: los cobrados de verdad se quedan (ver config/borrarPedido.ts).
 * Al borrar uno:
 * - si aún tenía las piezas apartadas, vuelven al almacén;
 * - sus códigos de activación sin usar se borran (nadie los tiene); los que alguien ya activó se
 *   quedan, sin pedido, y esa persona conserva su curso;
 * - si era un pago de Stripe a medias, primero se cancela el intento de pago.
 */
import "server-only";
import { devuelveStockAlBorrar, motivoNoBorrarPedido } from "@/config/borrarPedido";
import { db, transaccion } from "@/lib/db";
import { salidasDePedido } from "@/lib/pedidos";

export interface ResultadoBorrado {
  borrados: string[];
  /** Los que no se han borrado, con su número y el motivo */
  saltados: { numero: string; motivo: string }[];
}

/**
 * Borra los pedidos indicados que se pueden borrar.
 * `cancelarIntento` (Stripe) se pasa desde fuera: devuelve false si Stripe dice que ya se ha pagado.
 */
export async function borrarPedidos(
  ids: string[],
  cancelarIntento: (referencia: string) => Promise<boolean>,
): Promise<ResultadoBorrado> {
  const resultado: ResultadoBorrado = { borrados: [], saltados: [] };
  for (const id of ids) {
    const r = await borrarUno(id, cancelarIntento);
    if (r === null) continue; // ya no existía
    if (r.ok) resultado.borrados.push(r.numero);
    else resultado.saltados.push({ numero: r.numero, motivo: r.motivo });
  }
  return resultado;
}

type Respuesta = { ok: true; numero: string } | { ok: false; numero: string; motivo: string };

async function borrarUno(
  id: string,
  cancelarIntento: (referencia: string) => Promise<boolean>,
): Promise<Respuesta | null> {
  // 1) Un pago de Stripe a medias: que no se pueda completar después de borrar el pedido
  const previo = await db.pedido.findUnique({
    where: { id },
    select: {
      numero: true,
      estado: true,
      cobroReal: true,
      proveedorPago: true,
      referenciaPago: true,
    },
  });
  if (!previo) return null;
  const motivo = motivoNoBorrarPedido(previo);
  if (motivo) return { ok: false, numero: previo.numero, motivo };
  if (previo.estado === "PENDIENTE" && previo.proveedorPago === "stripe" && previo.referenciaPago) {
    if (!(await cancelarIntento(previo.referenciaPago))) {
      return {
        ok: false,
        numero: previo.numero,
        motivo: "Stripe dice que se acaba de pagar: espera a que llegue la confirmación.",
      };
    }
  }

  // 2) Todo lo demás de una vez (si algo falla, no se toca nada)
  try {
    return await borrarEnTransaccion(id);
  } catch (error) {
    if (!(error instanceof PedidoCambiado)) throw error;
    return {
      ok: false,
      numero: previo.numero,
      motivo: "Ha cambiado mientras se borraba. Recarga la página.",
    };
  }
}

class PedidoCambiado extends Error {}

function borrarEnTransaccion(id: string) {
  return transaccion(async (tx): Promise<Respuesta | null> => {
    const pedido = await tx.pedido.findUnique({ where: { id }, include: { lineas: true } });
    if (!pedido) return null;
    // Se vuelve a mirar dentro de la transacción: el webhook de Stripe pudo cobrarlo mientras tanto
    const motivoAhora = motivoNoBorrarPedido(pedido);
    if (motivoAhora) return { ok: false, numero: pedido.numero, motivo: motivoAhora };

    if (devuelveStockAlBorrar(pedido.estado)) {
      const devueltas = salidasDePedido(pedido.lineas);
      for (const [slug, unidades] of devueltas.componentes) {
        await tx.componente.updateMany({
          where: { slug },
          data: { stock: { increment: unidades } },
        });
      }
      for (const [slug, unidades] of devueltas.kits) {
        await tx.kit.updateMany({ where: { slug }, data: { stock: { increment: unidades } } });
      }
    }

    // Códigos: los que nadie usó y no son de un lote impreso se borran; el resto se queda sin pedido
    await tx.codigoActivacion.deleteMany({ where: { pedidoId: id, usadoEn: null, loteId: null } });
    await tx.codigoActivacion.updateMany({ where: { pedidoId: id }, data: { pedidoId: null } });
    await tx.lineaPedido.deleteMany({ where: { pedidoId: id } });

    // Condicionado: si alguien lo ha cobrado de verdad a la vez, no se borra
    const borrado = await tx.pedido.deleteMany({ where: { id, cobroReal: false } });
    if (borrado.count === 0) {
      throw new PedidoCambiado();
    }
    return { ok: true, numero: pedido.numero };
  });
}
