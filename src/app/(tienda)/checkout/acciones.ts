"use server";

/**
 * ACCIONES DEL CHECKOUT (se ejecutan en el servidor)
 *   prepararPedido       → valida los datos, recalcula los precios con la base de datos,
 *                          reserva el stock, guarda el pedido PENDIENTE y prepara el pago
 *   confirmarPagoSimulado → solo sin claves de Stripe: marca el pedido como pagado
 *   anularPedidoPendiente → «Cambiar mis datos»: cancela el pedido sin pagar y libera el stock
 * Nunca se fían de los precios del navegador.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { enviarConfirmacionPedido } from "@/lib/avisosPedido";
import { db } from "@/lib/db";
import { ipDelCliente, registrarIntento } from "@/lib/limite";
import { ErrorConfigPagos, modoPago } from "@/lib/pagos";
import { cancelarIntentoPago, crearIntentoPago } from "@/lib/pagos/stripe";
import {
  calcularPrecios,
  cancelarPedido,
  crearPedido,
  ErrorPedido,
  liberarPedidosCaducados,
  marcarPedidoPagado,
  tokenValido,
  urlPedido,
} from "@/lib/pedidos";
import { obtenerUsuario } from "@/lib/sesion";
import {
  esquemaCarritoPedido,
  esquemaCheckout,
  type DatosCliente,
} from "@/lib/validaciones/pedido";

type Campo = keyof DatosCliente | "aceptaCondiciones";

/** Máximo de direcciones guardadas por cuenta */
const MAXIMO_DIRECCIONES = 10;

export interface EstadoCheckout {
  ok: boolean;
  /** Mensaje general de error */
  mensaje?: string;
  /** Errores de cada campo del formulario */
  errores?: Partial<Record<Campo, string>>;
  /** Lo que escribió el cliente, para no tener que repetirlo si hay un error */
  valores?: Partial<Record<Campo, string>>;
  /** Si los precios han cambiado: el precio nuevo de cada artículo del carrito */
  preciosActualizados?: { id: string; precioCentimos: number }[];
  /** Pedido creado y listo para pagar */
  pago?: {
    pedidoId: string;
    numero: string;
    token: string;
    totalCentimos: number;
    /** Dirección privada del pedido (a donde vuelve el cliente después de pagar) */
    url: string;
  } & ({ modo: "stripe"; clientSecret: string; clavePublica: string } | { modo: "simulado" });
}

const CAMPOS = [
  "nombre",
  "email",
  "telefono",
  "direccion",
  "codigoPostal",
  "ciudad",
  "provincia",
] as const;

export async function prepararPedido(
  _anterior: EstadoCheckout,
  formulario: FormData,
): Promise<EstadoCheckout> {
  const usuario = await obtenerUsuario();
  const valores: Record<string, string> = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(formulario.get(campo) ?? "").slice(0, 300)]),
  );
  // Con la sesión iniciada, el email es siempre el de la cuenta (ya verificado)
  if (usuario) valores.email = usuario.email;
  valores.aceptaCondiciones = formulario.get("aceptaCondiciones") === "on" ? "on" : "";

  // 0. Límite de intentos por IP (evita que alguien bloquee el stock con pedidos falsos)
  if (!(await registrarIntento("checkout", await ipDelCliente()))) {
    return {
      ok: false,
      valores,
      mensaje: "Has hecho demasiados intentos seguidos. Espera unos minutos y vuelve a probar.",
    };
  }

  // 1. Datos del cliente
  const datos = esquemaCheckout.safeParse(valores);
  const errores: Partial<Record<Campo, string>> = {};
  if (!datos.success) {
    const { fieldErrors } = z.flattenError(datos.error);
    for (const [campo, mensajes] of Object.entries(fieldErrors)) {
      errores[campo as Campo] = (mensajes as string[] | undefined)?.[0];
    }
  }
  if (valores.aceptaCondiciones !== "on") {
    errores.aceptaCondiciones = "Para continuar, acepta las condiciones de venta.";
  }
  if (!datos.success || errores.aceptaCondiciones) {
    // Un CP de fuera de la zona tiene su propio mensaje amable arriba
    return {
      ok: false,
      valores,
      errores,
      mensaje: errores.codigoPostal?.startsWith("¡Vaya!")
        ? errores.codigoPostal
        : "Revisa los datos marcados en rojo.",
    };
  }

  // 2. Carrito (llega como texto JSON desde el navegador)
  let crudo: unknown;
  try {
    crudo = JSON.parse(String(formulario.get("carrito") ?? "[]"));
  } catch {
    crudo = [];
  }
  const carrito = esquemaCarritoPedido.safeParse(crudo);
  if (!carrito.success) {
    return {
      ok: false,
      valores,
      mensaje: "Tu carrito está vacío o tiene algún problema. Revísalo.",
    };
  }
  const ids = (Array.isArray(crudo) ? crudo : []).map((a) => String(a?.id ?? ""));
  const subtotalMostrado = Number(formulario.get("subtotalMostrado"));

  try {
    const modo = modoPago();
    if (modo === "desactivado") {
      return {
        ok: false,
        valores,
        mensaje:
          "Ahora mismo no podemos cobrar pedidos. Vuelve a intentarlo en un rato, por favor.",
      };
    }

    // 3. ¿Han cambiado los precios desde que se añadió al carrito? (recalculados con la BD)
    const { subtotalCentimos, precios } = await calcularPrecios(carrito.data);
    if (subtotalCentimos !== subtotalMostrado) {
      return {
        ok: false,
        valores,
        mensaje:
          "Algunos precios han cambiado desde que añadiste los productos. Hemos actualizado tu carrito: revisa el total y vuelve a pulsar «Continuar al pago».",
        preciosActualizados: precios.map((precioCentimos, i) => ({ id: ids[i], precioCentimos })),
      };
    }

    // 4. Liberamos el stock de pedidos abandonados y guardamos este (reservando su stock)
    await liberarPedidosCaducados(modo === "stripe" ? cancelarIntentoPago : undefined);
    const pedido = await crearPedido(datos.data, carrito.data, {
      proveedorPago: modo,
      usuarioId: usuario?.id ?? null,
    });

    // 5. Guardar la dirección en la cuenta (si lo ha pedido)
    if (usuario && formulario.get("guardarDireccion") === "on") {
      await guardarDireccion(usuario.id, datos.data);
    }

    const base = {
      pedidoId: pedido.id,
      numero: pedido.numero,
      token: urlPedido(pedido.id).split("?t=")[1],
      totalCentimos: pedido.totalCentimos,
      url: urlPedido(pedido.id),
    };

    // 6. Preparamos el pago
    if (modo === "simulado") return { ok: true, pago: { ...base, modo } };

    let intento;
    try {
      intento = await crearIntentoPago(pedido);
    } catch (error) {
      await cancelarPedido(pedido.id);
      throw error;
    }
    await db.pedido.update({ where: { id: pedido.id }, data: { referenciaPago: intento.id } });
    return {
      ok: true,
      pago: {
        ...base,
        modo,
        clientSecret: intento.clientSecret,
        clavePublica: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      },
    };
  } catch (error) {
    if (error instanceof ErrorPedido) return { ok: false, valores, mensaje: error.message };
    if (error instanceof ErrorConfigPagos) console.error("Configuración de pagos:", error.message);
    else console.error("Error al preparar el pedido:", error);
    return {
      ok: false,
      valores,
      mensaje: "No hemos podido preparar tu pedido. Inténtalo de nuevo en unos minutos.",
    };
  }
}

/** Guarda la dirección en la cuenta si no estaba ya (máximo MAXIMO_DIRECCIONES) */
async function guardarDireccion(usuarioId: string, d: DatosCliente) {
  const datos = {
    nombre: d.nombre,
    telefono: d.telefono,
    direccion: d.direccion,
    codigoPostal: d.codigoPostal,
    ciudad: d.ciudad,
    provincia: d.provincia,
  };
  const [repetida, total] = await Promise.all([
    db.direccion.findFirst({ where: { usuarioId, ...datos } }),
    db.direccion.count({ where: { usuarioId } }),
  ]);
  if (repetida || total >= MAXIMO_DIRECCIONES) return;
  await db.direccion.create({ data: { usuarioId, ...datos, predeterminada: total === 0 } });
}

const esquemaPedidoToken = z.object({
  pedidoId: z.string().min(1).max(40),
  token: z.string().length(32),
});

/**
 * PAGO DE PRUEBA (solo sin claves de Stripe). Hace lo mismo que el webhook de Stripe al
 * confirmarse un pago: PAGADO, códigos de los kits y correo de confirmación.
 */
export async function confirmarPagoSimulado(pedidoId: string, token: string) {
  const datos = esquemaPedidoToken.safeParse({ pedidoId, token });
  if (!datos.success || !tokenValido(pedidoId, token)) return { ok: false as const };
  if (modoPago() !== "simulado") return { ok: false as const };

  const pedido = await db.pedido.findUnique({
    where: { id: pedidoId },
    select: { estado: true, proveedorPago: true },
  });
  if (!pedido || pedido.proveedorPago !== "simulado" || pedido.estado !== "PENDIENTE") {
    return { ok: false as const };
  }

  const referencia = `SIM-${pedidoId.slice(-8).toUpperCase()}`;
  if ((await marcarPedidoPagado(pedidoId, referencia)) === "pagado") {
    await enviarConfirmacionPedido(pedidoId);
  }
  redirect(`${urlPedido(pedidoId)}&nuevo=1`);
}

/** «Cambiar mis datos»: anula el pedido aún sin pagar para volver al formulario */
export async function anularPedidoPendiente(pedidoId: string, token: string) {
  const datos = esquemaPedidoToken.safeParse({ pedidoId, token });
  if (!datos.success || !tokenValido(pedidoId, token)) return { ok: false };

  const pedido = await db.pedido.findUnique({
    where: { id: pedidoId },
    select: { estado: true, proveedorPago: true, referenciaPago: true },
  });
  if (!pedido || pedido.estado !== "PENDIENTE") return { ok: false };
  // Si el cliente ya ha pagado en Stripe (por ejemplo, en otra pestaña), no se anula
  if (pedido.proveedorPago === "stripe" && pedido.referenciaPago) {
    if (!(await cancelarIntentoPago(pedido.referenciaPago))) return { ok: false };
  }
  return { ok: await cancelarPedido(pedidoId) };
}
