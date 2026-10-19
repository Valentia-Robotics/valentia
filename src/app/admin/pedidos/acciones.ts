"use server";

/**
 * ACCIONES DEL PANEL: PEDIDOS
 * Cambiar el estado (Preparando → Enviado → Entregado, o Cancelado) y el número de seguimiento.
 * Al pasar a ENVIADO se manda un correo al cliente. Solo para ADMIN (se comprueba aquí).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { transicionesPanel } from "@/config/estadosPedido";
import { EstadoPedido } from "@/generated/prisma/enums";
import { conErrores, type EstadoFormulario, texto } from "@/lib/admin/formularios";
import { enviarAvisoEnvio } from "@/lib/avisosPedido";
import { db } from "@/lib/db";
import { cancelarIntentoPago } from "@/lib/pagos/stripe";
import { cancelarPedido } from "@/lib/pedidos";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { esquemaId } from "@/lib/ids";

const esquema = z.object({
  pedidoId: esquemaId,
  estado: z.enum(EstadoPedido),
  numeroSeguimiento: z
    .string()
    .trim()
    .max(60, "Como mucho 60 caracteres")
    .regex(/^[A-Za-z0-9 ._/-]*$/, "Solo letras, números, espacios y - . _ /"),
});

export async function actualizarPedido(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const datos = esquema.safeParse({
    pedidoId: texto(formulario, "pedidoId"),
    estado: texto(formulario, "estado"),
    numeroSeguimiento: texto(formulario, "numeroSeguimiento"),
  });
  if (!datos.success) return conErrores(datos.error);
  const { pedidoId, estado, numeroSeguimiento } = datos.data;

  const pedido = await db.pedido.findUnique({
    where: { id: pedidoId },
    select: { estado: true, proveedorPago: true, referenciaPago: true, pagadoEn: true },
  });
  if (!pedido) return { ok: false, mensaje: "Este pedido ya no existe." };

  const cambiaEstado = estado !== pedido.estado;
  if (cambiaEstado && !transicionesPanel[pedido.estado].includes(estado)) {
    return { ok: false, mensaje: "Ese cambio de estado no está permitido." };
  }
  if (estado === "ENVIADO" && !numeroSeguimiento) {
    return {
      ok: false,
      mensaje: "Escribe el número de seguimiento para avisar al cliente.",
      errores: { numeroSeguimiento: "Obligatorio al marcar el pedido como enviado" },
    };
  }

  // ---------- Cancelar ----------
  if (cambiaEstado && estado === "CANCELADO") {
    if (
      pedido.estado === "PENDIENTE" &&
      pedido.proveedorPago === "stripe" &&
      pedido.referenciaPago
    ) {
      if (!(await cancelarIntentoPago(pedido.referenciaPago))) {
        return {
          ok: false,
          mensaje:
            "Stripe dice que este pedido ya se ha pagado: espera a que llegue la confirmación.",
        };
      }
    }
    await cancelarPedido(pedidoId, [pedido.estado]);
    refrescar(pedidoId);
    const cobrado = pedido.pagadoEn !== null && pedido.proveedorPago === "stripe";
    return {
      ok: true,
      mensaje: cobrado
        ? "Pedido cancelado y stock devuelto. Recuerda devolver el dinero desde el panel de Stripe."
        : "Pedido cancelado y stock devuelto.",
    };
  }

  // ---------- Otro estado o solo el número de seguimiento ----------
  const ahora = new Date();
  const cambio = await db.pedido.updateMany({
    // Condicionado al estado que hemos leído: si alguien lo ha cambiado a la vez, no pisamos nada
    where: { id: pedidoId, estado: pedido.estado },
    data: {
      estado,
      numeroSeguimiento: numeroSeguimiento || null,
      ...(cambiaEstado && estado === "ENVIADO" ? { enviadoEn: ahora } : {}),
      ...(cambiaEstado && estado === "ENTREGADO" ? { entregadoEn: ahora } : {}),
    },
  });
  if (cambio.count === 0) {
    return { ok: false, mensaje: "El pedido ha cambiado mientras tanto. Recarga la página." };
  }

  if (cambiaEstado && estado === "ENVIADO") await enviarAvisoEnvio(pedidoId);
  refrescar(pedidoId);
  return {
    ok: true,
    mensaje:
      cambiaEstado && estado === "ENVIADO"
        ? "Pedido marcado como enviado. Hemos avisado al cliente por email."
        : "Cambios guardados.",
  };
}

function refrescar(pedidoId: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin");
}
