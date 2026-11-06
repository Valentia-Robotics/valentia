"use server";

/**
 * ACCIONES DEL PANEL: PEDIDOS
 * Cambiar el estado (Preparando → Enviado → Entregado, o Cancelado) y el número de seguimiento.
 * También varios a la vez (casillas de la lista y pantalla «Por enviar»).
 * Al pasar a ENVIADO se manda un correo al cliente. Solo para ADMIN (se comprueba aquí).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { estadosPedido, transicionesPanel } from "@/config/estadosPedido";
import { EstadoPedido } from "@/generated/prisma/enums";
import { conErrores, type EstadoFormulario, texto, textos } from "@/lib/admin/formularios";
import { enviarAvisoEnvio } from "@/lib/avisosPedido";
import { db } from "@/lib/db";
import { cancelarIntentoPago } from "@/lib/pagos/stripe";
import { cancelarPedido } from "@/lib/pedidos";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { esId, esquemaId } from "@/lib/ids";
import { plural } from "@/lib/utils";

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
  if (estado === "ENVIADO" && !numeroSeguimiento && pedido.estado !== "ENTREGADO") {
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
  if (!(await aplicarCambio(pedidoId, pedido.estado, estado, numeroSeguimiento))) {
    return { ok: false, mensaje: "El pedido ha cambiado mientras tanto. Recarga la página." };
  }
  refrescar(pedidoId);
  return {
    ok: true,
    mensaje:
      cambiaEstado && estado === "ENVIADO" && pedido.estado !== "ENTREGADO"
        ? "Pedido marcado como enviado. Hemos avisado al cliente por email."
        : "Cambios guardados.",
  };
}

/**
 * Guarda el nuevo estado (y el número de seguimiento) si el pedido sigue en el estado leído.
 * Al pasar a ENVIADO avisa al cliente por email. Devuelve false si alguien lo cambió a la vez.
 * (Cancelar no pasa por aquí: devuelve stock y puede tocar Stripe.)
 */
async function aplicarCambio(
  pedidoId: string,
  anterior: EstadoPedido,
  estado: EstadoPedido,
  numeroSeguimiento: string,
): Promise<boolean> {
  const cambiaEstado = estado !== anterior;
  const ahora = new Date();
  const cambio = await db.pedido.updateMany({
    // Condicionado al estado que hemos leído: si alguien lo ha cambiado a la vez, no pisamos nada
    where: { id: pedidoId, estado: anterior },
    data: {
      estado,
      numeroSeguimiento: numeroSeguimiento || null,
      ...(cambiaEstado && estado === "ENVIADO" ? { enviadoEn: ahora, entregadoEn: null } : {}),
      ...(cambiaEstado && estado === "ENTREGADO" ? { entregadoEn: ahora } : {}),
    },
  });
  if (cambio.count === 0) return false;
  // El correo solo la primera vez (no al devolver a «Enviado» uno que se dio por entregado)
  if (cambiaEstado && estado === "ENVIADO" && anterior !== "ENTREGADO") {
    await enviarAvisoEnvio(pedidoId);
  }
  return true;
}

/** Como mucho, cuántos pedidos se cambian de una vez */
const MAXIMO_LOTE = 200;

const esquemaVarios = z.object({
  ids: z.array(esquemaId).min(1, "Marca al menos un pedido.").max(MAXIMO_LOTE),
  estado: z.enum(["PREPARANDO", "ENTREGADO"]),
});

/** Varios pedidos a la vez (casillas de la lista): pasarlos a «Preparando» o a «Entregado» */
export async function cambiarVariosPedidos(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const datos = esquemaVarios.safeParse({
    ids: [...new Set(textos(formulario, "ids"))],
    estado: texto(formulario, "estado"),
  });
  if (!datos.success) return conErrores(datos.error);
  const { ids, estado } = datos.data;

  const pedidos = await db.pedido.findMany({
    where: { id: { in: ids } },
    select: { id: true, estado: true, numeroSeguimiento: true },
  });
  let cambiados = 0;
  for (const p of pedidos) {
    if (!transicionesPanel[p.estado].includes(estado)) continue;
    if (await aplicarCambio(p.id, p.estado, estado, p.numeroSeguimiento ?? "")) cambiados++;
  }
  refrescar();

  const nombre = estadosPedido[estado].nombre;
  const saltados = ids.length - cambiados;
  return {
    ok: cambiados > 0,
    mensaje:
      (cambiados
        ? `${plural(cambiados, "pedido marcado", "pedidos marcados")} como «${nombre}».`
        : `Ningún pedido se ha marcado como «${nombre}».`) +
      (saltados
        ? ` ${plural(saltados, "no se ha cambiado", "no se han cambiado")} porque su estado no lo permite${estado === "ENTREGADO" ? " (antes tiene que estar «Enviado»)" : ""}.`
        : ""),
  };
}

const seguimiento = esquema.shape.numeroSeguimiento;

/**
 * Pantalla «Por enviar»: cada pedido con número de seguimiento escrito pasa a ENVIADO
 * (y su cliente recibe el correo). Los que se dejan en blanco no cambian.
 */
export async function enviarVariosPedidos(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const numeros = new Map<string, string>();
  const errores: Record<string, string> = {};
  for (const [campo, valor] of formulario.entries()) {
    if (!campo.startsWith("seguimiento-") || typeof valor !== "string" || !valor.trim()) continue;
    const id = campo.slice("seguimiento-".length);
    if (!esId(id)) continue;
    const leido = seguimiento.safeParse(valor);
    if (leido.success) numeros.set(id, leido.data);
    else errores[campo] = leido.error.issues[0]?.message ?? "Número no válido";
  }
  if (Object.keys(errores).length) {
    return {
      ok: false,
      mensaje: "Revisa los números marcados en rojo: no se ha enviado nada.",
      errores,
    };
  }
  if (!numeros.size) {
    return { ok: false, mensaje: "Escribe el número de seguimiento de los pedidos que salen hoy." };
  }
  if (numeros.size > MAXIMO_LOTE) {
    return { ok: false, mensaje: `Como mucho ${MAXIMO_LOTE} pedidos de una vez.` };
  }

  const pedidos = await db.pedido.findMany({
    where: { id: { in: [...numeros.keys()] } },
    select: { id: true, estado: true },
  });
  let enviados = 0;
  for (const p of pedidos) {
    if (!transicionesPanel[p.estado].includes("ENVIADO")) continue;
    if (await aplicarCambio(p.id, p.estado, "ENVIADO", numeros.get(p.id)!)) enviados++;
  }
  refrescar();
  const saltados = numeros.size - enviados;
  return {
    ok: enviados > 0,
    mensaje:
      (enviados
        ? `Enviados: ${enviados}. Hemos avisado a ${enviados === 1 ? "su cliente" : "cada cliente"} por email con su número de seguimiento.`
        : "No se ha enviado ningún pedido.") +
      (saltados
        ? ` ${plural(saltados, "pedido ha", "pedidos han")} cambiado mientras tanto y no se ${saltados === 1 ? "ha" : "han"} tocado.`
        : ""),
  };
}

function refrescar(pedidoId?: string) {
  revalidatePath("/admin/pedidos", "layout");
  if (pedidoId) revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin");
}
