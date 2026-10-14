"use server";

/**
 * ACCIÓN DEL CHECKOUT
 * Se ejecuta en el servidor al pulsar "Pagar". Nunca se fía de los precios
 * del navegador: los vuelve a calcular con la base de datos.
 */
import { z } from "zod";
import { obtenerProveedorPago } from "@/lib/pagos";
import {
  calcularPrecios,
  cancelarPedido,
  crearPedido,
  ErrorPedido,
  marcarPedidoPagado,
} from "@/lib/pedidos";
import {
  esquemaCarritoPedido,
  esquemaDatosCliente,
  type DatosCliente,
} from "@/lib/validaciones/pedido";

export interface EstadoCheckout {
  /** true si todo ha ido bien y hay que ir a "redirigir" */
  ok: boolean;
  /** Mensaje general de error */
  mensaje?: string;
  /** Errores de cada campo del formulario */
  errores?: Partial<Record<keyof DatosCliente, string>>;
  /** Lo que escribió el cliente, para no tener que repetirlo si hay un error */
  valores?: Partial<Record<keyof DatosCliente, string>>;
  /** Si los precios han cambiado: el precio nuevo de cada artículo del carrito */
  preciosActualizados?: { id: string; precioCentimos: number }[];
  /** A dónde ir después: la página del pedido (o la de Stripe) */
  redirigir?: string;
}

const CAMPOS = ["nombre", "email", "direccion", "codigoPostal", "ciudad"] as const;

export async function realizarPedido(
  _anterior: EstadoCheckout,
  formulario: FormData,
): Promise<EstadoCheckout> {
  const valores = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(formulario.get(campo) ?? "")]),
  ) as Record<keyof DatosCliente, string>;

  // 1. Datos del cliente
  const datos = esquemaDatosCliente.safeParse(valores);
  if (!datos.success) {
    const { fieldErrors } = z.flattenError(datos.error);
    const errores = Object.fromEntries(
      Object.entries(fieldErrors).map(([campo, mensajes]) => [campo, mensajes?.[0]]),
    );
    return { ok: false, valores, errores, mensaje: "Revisa los datos marcados en rojo." };
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
  const totalMostrado = Number(formulario.get("totalMostrado"));

  const proveedor = obtenerProveedorPago();
  const urlWeb = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    // 3. ¿Han cambiado los precios desde que se añadió al carrito?
    const { totalCentimos, precios } = await calcularPrecios(carrito.data);
    if (totalCentimos !== totalMostrado) {
      return {
        ok: false,
        valores,
        mensaje:
          "Algunos precios han cambiado desde que añadiste los productos. Hemos actualizado tu carrito: revisa el total y vuelve a pulsar «Pagar».",
        preciosActualizados: precios.map((precioCentimos, i) => ({ id: ids[i], precioCentimos })),
      };
    }

    // 4. Guardamos el pedido (y descontamos el stock)
    const pedido = await crearPedido(datos.data, carrito.data, proveedor.id);

    // 5. Cobramos
    let resultado;
    try {
      resultado = await proveedor.cobrar({
        pedidoId: pedido.id,
        numero: pedido.numero,
        email: pedido.email,
        totalCentimos: pedido.totalCentimos,
        lineas: pedido.lineas,
        urlExito: `${urlWeb}/pedido/${pedido.id}`,
        urlCancelar: `${urlWeb}/checkout`,
      });
    } catch (error) {
      await cancelarPedido(pedido.id);
      throw error;
    }

    // 6. Pago hecho: creamos los códigos de los kits y vamos a la confirmación
    if (resultado.estado === "pagado") {
      await marcarPedidoPagado(pedido.id, resultado.referencia);
      return { ok: true, redirigir: `/pedido/${pedido.id}` };
    }
    // Stripe: el cliente paga en su página y el webhook marcará el pedido como pagado
    return { ok: true, redirigir: resultado.url };
  } catch (error) {
    if (error instanceof ErrorPedido) return { ok: false, valores, mensaje: error.message };
    console.error("Error al realizar el pedido:", error);
    return {
      ok: false,
      valores,
      mensaje: "No hemos podido completar el pedido. Inténtalo de nuevo en unos minutos.",
    };
  }
}
