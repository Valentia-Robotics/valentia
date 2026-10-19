/**
 * PEDIDOS
 * Todo lo que pasa en el servidor al comprar:
 *   1. calcularLineas      → vuelve a calcular los precios con la base de datos
 *   2. crearPedido         → reserva el stock (sin dejarlo nunca en negativo) y guarda el pedido PENDIENTE
 *   3. marcarPedidoPagado  → SOLO con el pago confirmado (webhook de Stripe o pago de prueba):
 *                            PAGADO + un código de activación por cada kit. Idempotente.
 *   4. cancelarPedido      → si el pago no se completa (o se cancela desde el panel): devuelve el stock
 *   5. liberarPedidosCaducados → cancela los pedidos abandonados sin pagar y libera su stock
 *
 * Decisión: el stock se RESERVA al crear el pedido (y no al cobrar) para no cobrar nunca
 * algo que ya no queda; si el pago no llega en MINUTOS_RESERVA, la reserva se libera.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { generarCodigoActivacion, generarNumeroPedido } from "@/lib/codigos";
import { db, transaccion, type Tx } from "@/lib/db";
import { calcularTotales } from "@/lib/precios";
import type { ArticuloPedido, DatosCliente } from "@/lib/validaciones/pedido";


/** Filtro de Prisma: pedidos cobrados y no cancelados (Pagado, Preparando, Enviado, Entregado) */
export const PEDIDO_COBRADO = {
  pagadoEn: { not: null },
  estado: { not: "CANCELADO" },
} satisfies Prisma.PedidoWhereInput;

/** Minutos que se guarda el stock de un pedido sin pagar antes de liberarlo */
export const MINUTOS_RESERVA = 60;

/** Error con un mensaje que se puede enseñar al cliente tal cual */
export class ErrorPedido extends Error {}

// "type" (y no "interface") para que Prisma acepte guardarlo en un campo JSON
type PiezaLinea = {
  slug: string;
  nombre: string;
  cantidad: number;
};

interface LineaCalculada {
  tipo: "KIT" | "COMPONENTE" | "CONFIGURACION";
  nombre: string;
  slug: string | null;
  precioUnitarioCentimos: number;
  cantidad: number;
  piezas?: PiezaLinea[];
}

/**
 * Convierte los artículos del carrito en líneas de pedido con precios del servidor.
 * También devuelve cuántas unidades de cada componente salen del almacén.
 */
async function calcularLineas(tx: Tx, articulos: ArticuloPedido[]) {
  const slugsKits = articulos.flatMap((a) => (a.tipo === "kit" ? [a.slug] : []));
  const slugsComponentes = articulos.flatMap((a) =>
    a.tipo === "componente"
      ? [a.slug]
      : a.tipo === "configuracion"
        ? a.piezas.map((p) => p.slug)
        : [],
  );

  const [kits, componentes] = await Promise.all([
    tx.kit.findMany({ where: { slug: { in: slugsKits }, visible: true } }),
    // Los componentes ocultos desde el panel no se pueden comprar sueltos
    tx.componente.findMany({ where: { slug: { in: slugsComponentes }, visible: true } }),
  ]);
  const kitPorSlug = new Map(kits.map((k) => [k.slug, k]));
  const componentePorSlug = new Map(componentes.map((c) => [c.slug, c]));

  const buscarComponente = (slug: string) => {
    const componente = componentePorSlug.get(slug);
    if (!componente) {
      throw new ErrorPedido(
        "Uno de los productos de tu carrito ya no está disponible. Revísalo, por favor.",
      );
    }
    return componente;
  };

  /** slug del componente → unidades que salen del almacén */
  const salidas = new Map<string, number>();
  const sacar = (slug: string, unidades: number) =>
    salidas.set(slug, (salidas.get(slug) ?? 0) + unidades);

  const lineas: LineaCalculada[] = articulos.map((articulo) => {
    if (articulo.tipo === "kit") {
      const kit = kitPorSlug.get(articulo.slug);
      if (!kit) throw new ErrorPedido("Uno de los kits de tu carrito ya no está disponible.");
      return {
        tipo: "KIT",
        nombre: kit.nombre,
        slug: kit.slug,
        precioUnitarioCentimos: kit.precioCentimos,
        cantidad: articulo.cantidad,
      };
    }

    if (articulo.tipo === "componente") {
      const componente = buscarComponente(articulo.slug);
      sacar(componente.slug, articulo.cantidad);
      return {
        tipo: "COMPONENTE",
        nombre: componente.nombre,
        slug: componente.slug,
        precioUnitarioCentimos: componente.precioCentimos,
        cantidad: articulo.cantidad,
      };
    }

    // Robot personalizado: su precio es la suma de sus piezas
    const piezas = articulo.piezas.map((p) => {
      const componente = buscarComponente(p.slug);
      sacar(componente.slug, p.cantidad * articulo.cantidad);
      return {
        slug: componente.slug,
        nombre: componente.nombre,
        cantidad: p.cantidad,
        precio: componente.precioCentimos,
      };
    });
    return {
      tipo: "CONFIGURACION",
      nombre: articulo.nombre,
      slug: null,
      precioUnitarioCentimos: piezas.reduce((t, p) => t + p.precio * p.cantidad, 0),
      cantidad: articulo.cantidad,
      piezas: piezas.map(({ slug, nombre, cantidad }) => ({ slug, nombre, cantidad })),
    };
  });

  const subtotalCentimos = lineas.reduce((t, l) => t + l.precioUnitarioCentimos * l.cantidad, 0);
  return { lineas, subtotalCentimos, salidas, componentePorSlug };
}

/**
 * Precios reales de un carrito, sin guardar nada (para avisar si han cambiado).
 * "precios" va en el mismo orden que los artículos: precio de una unidad de cada uno.
 */
export function calcularPrecios(articulos: ArticuloPedido[]) {
  return transaccion(async (tx) => {
    const { lineas, subtotalCentimos } = await calcularLineas(tx, articulos);
    return { subtotalCentimos, precios: lineas.map((l) => l.precioUnitarioCentimos) };
  });
}

/** Saca del almacén las unidades pedidas, solo si quedan (comprobación y resta a la vez) */
async function reservarStock(
  tx: Tx,
  salidas: Map<string, number>,
  nombres?: Map<string, { nombre: string; stock: number }>,
) {
  for (const [slug, unidades] of salidas) {
    const resultado = await tx.componente.updateMany({
      where: { slug, stock: { gte: unidades } },
      data: { stock: { decrement: unidades } },
    });
    if (resultado.count === 0) {
      const componente = nombres?.get(slug);
      throw new ErrorPedido(
        componente
          ? `No nos quedan suficientes unidades de «${componente.nombre}» (quedan ${componente.stock}).`
          : "Ya no queda stock suficiente de alguno de los productos.",
      );
    }
  }
}

/** Unidades de cada componente que se llevó un pedido guardado (para devolverlas o reservarlas) */
function salidasDePedido(
  lineas: { tipo: string; slug: string | null; cantidad: number; piezas: unknown }[],
) {
  const salidas = new Map<string, number>();
  for (const linea of lineas) {
    const piezas =
      linea.tipo === "COMPONENTE" && linea.slug
        ? [{ slug: linea.slug, unidades: linea.cantidad }]
        : linea.tipo === "CONFIGURACION"
          ? piezasDeLinea(linea.piezas).map((p) => ({
              slug: p.slug,
              unidades: p.cantidad * linea.cantidad,
            }))
          : [];
    for (const { slug, unidades } of piezas) {
      salidas.set(slug, (salidas.get(slug) ?? 0) + unidades);
    }
  }
  return salidas;
}

/**
 * Token del enlace privado de un pedido (/pedido/id?t=…), para quien compra sin cuenta.
 * Es una firma (HMAC) del id con AUTH_SECRET: no hace falta guardarlo, nadie puede
 * fabricarlo sin la clave secreta y sirve igual en el correo y en la vuelta de Stripe.
 */
export function tokenAccesoPedido(pedidoId: string): string {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) throw new Error("Falta AUTH_SECRET en .env");
  return createHmac("sha256", secreto)
    .update(`pedido:${pedidoId}`)
    .digest("base64url")
    .slice(0, 32);
}

/** ¿Es este el token del enlace privado del pedido? (comparación en tiempo constante) */
export function tokenValido(pedidoId: string, token: unknown): boolean {
  if (typeof token !== "string" || token.length !== 32) return false;
  const a = Buffer.from(tokenAccesoPedido(pedidoId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Dirección privada de un pedido (con su token), relativa o completa */
export function urlPedido(pedidoId: string, completa = false): string {
  const ruta = `/pedido/${pedidoId}?t=${tokenAccesoPedido(pedidoId)}`;
  if (!completa) return ruta;
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return base + ruta;
}

interface OpcionesPedido {
  proveedorPago: "stripe" | "simulado";
  usuarioId: string | null;
}

/** Guarda el pedido como PENDIENTE y reserva el stock. Todo o nada (transacción). */
export async function crearPedido(
  cliente: DatosCliente,
  articulos: ArticuloPedido[],
  opciones: OpcionesPedido,
) {
  return transaccion(async (tx) => {
    const { lineas, subtotalCentimos, salidas, componentePorSlug } = await calcularLineas(
      tx,
      articulos,
    );
    await reservarStock(tx, salidas, componentePorSlug);

    // Envío, total e IVA calculados en el servidor (src/lib/precios.ts)
    const totales = calcularTotales(subtotalCentimos);
    return tx.pedido.create({
      data: {
        numero: generarNumeroPedido(),
        ...cliente,
        usuarioId: opciones.usuarioId,
        subtotalCentimos: totales.subtotalCentimos,
        envioCentimos: totales.envioCentimos,
        ivaCentimos: totales.ivaCentimos,
        totalCentimos: totales.totalCentimos,
        proveedorPago: opciones.proveedorPago,
        aceptaCondicionesEn: new Date(),
        lineas: {
          create: lineas.map((l) => ({
            tipo: l.tipo,
            nombre: l.nombre,
            slug: l.slug,
            precioUnitarioCentimos: l.precioUnitarioCentimos,
            cantidad: l.cantidad,
            piezas: l.piezas,
          })),
        },
      },
      include: { lineas: true },
    });
  });
}

/** Busca un código de activación que no exista todavía */
async function codigoLibre(tx: Tx, reservados: Set<string>): Promise<string> {
  for (let intento = 0; intento < 10; intento++) {
    const codigo = generarCodigoActivacion();
    if (reservados.has(codigo)) continue;
    if (!(await tx.codigoActivacion.findUnique({ where: { codigo } }))) return codigo;
  }
  throw new Error("No se pudo generar un código de activación único");
}

export type ResultadoPago = "pagado" | "ya-estaba-pagado" | "sin-stock" | "no-existe";

/**
 * Marca el pedido como PAGADO y crea un código de activación por cada kit (uno por unidad).
 * Los robots personalizados y los componentes sueltos no llevan código ni curso.
 *
 * Es IDEMPOTENTE: Stripe puede avisar dos veces (incluso a la vez). El cambio de estado se
 * hace con una actualización condicionada (solo si sigue PENDIENTE), así que solo una de las
 * llamadas crea los códigos; las demás devuelven "ya-estaba-pagado".
 * Si el pedido se había cancelado por caducar, intenta reservar el stock de nuevo.
 */
export async function marcarPedidoPagado(
  pedidoId: string,
  referenciaPago: string,
): Promise<ResultadoPago> {
  return transaccion(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { lineas: true },
    });
    if (!pedido) return "no-existe";

    let estadoPrevio: EstadoPedido = "PENDIENTE";
    if (pedido.estado === "CANCELADO" && pedido.pagadoEn === null) {
      // Pago que llega tarde (el pedido ya había caducado): volvemos a reservar el stock
      try {
        await reservarStock(tx, salidasDePedido(pedido.lineas));
      } catch (error) {
        if (error instanceof ErrorPedido) return "sin-stock";
        throw error;
      }
      estadoPrevio = "CANCELADO";
    }

    const ahora = new Date();
    const cambio = await tx.pedido.updateMany({
      where: { id: pedidoId, estado: estadoPrevio, pagadoEn: null },
      data: { estado: "PAGADO", pagadoEn: ahora, referenciaPago, canceladoEn: null },
    });
    if (cambio.count === 0) return "ya-estaba-pagado";

    const lineasKit = pedido.lineas.filter((l) => l.tipo === "KIT" && l.slug);
    const kits = await tx.kit.findMany({
      where: { slug: { in: lineasKit.map((l) => l.slug!) } },
      select: { id: true, slug: true },
    });
    const idKit = new Map(kits.map((k) => [k.slug, k.id]));

    const reservados = new Set<string>();
    const codigos: { codigo: string; kitId: string; pedidoId: string }[] = [];
    for (const linea of lineasKit) {
      const kitId = idKit.get(linea.slug!);
      if (!kitId) continue;
      for (let i = 0; i < linea.cantidad; i++) {
        const codigo = await codigoLibre(tx, reservados);
        reservados.add(codigo);
        codigos.push({ codigo, kitId, pedidoId });
      }
    }
    if (codigos.length > 0) await tx.codigoActivacion.createMany({ data: codigos });
    return "pagado";
  });
}

/**
 * Cancela un pedido y devuelve sus piezas al almacén.
 * Solo desde los estados indicados (por defecto, PENDIENTE: el pago no se completó).
 * Si ya estaba pagado (cancelación desde el panel), desactiva los códigos que nadie ha usado.
 * Devuelve true si lo ha cancelado.
 */
export async function cancelarPedido(
  pedidoId: string,
  desde: EstadoPedido[] = ["PENDIENTE"],
): Promise<boolean> {
  return transaccion(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { lineas: true },
    });
    if (!pedido || !desde.includes(pedido.estado)) return false;

    // Cambio condicionado: si otra petición lo ha cambiado a la vez, no devolvemos el stock dos veces
    const cambio = await tx.pedido.updateMany({
      where: { id: pedidoId, estado: pedido.estado },
      data: { estado: "CANCELADO", canceladoEn: new Date() },
    });
    if (cambio.count === 0) return false;

    for (const [slug, unidades] of salidasDePedido(pedido.lineas)) {
      await tx.componente.updateMany({ where: { slug }, data: { stock: { increment: unidades } } });
    }
    await tx.codigoActivacion.updateMany({
      where: { pedidoId, usadoEn: null, desactivadoEn: null },
      data: { desactivadoEn: new Date() },
    });
    return true;
  });
}

/**
 * Cancela los pedidos PENDIENTES más antiguos que MINUTOS_RESERVA (pagos abandonados) y libera
 * su stock. Antes, si eran de Stripe, cancela su intento de pago; si Stripe dice que ya se ha
 * pagado, el pedido no se toca (el webhook lo marcará como pagado).
 * Se llama al empezar cada compra, así que no hace falta ninguna tarea programada.
 */
export async function liberarPedidosCaducados(
  cancelarIntento?: (referencia: string) => Promise<boolean>,
) {
  const limite = new Date(Date.now() - MINUTOS_RESERVA * 60_000);
  const caducados = await db.pedido.findMany({
    where: { estado: "PENDIENTE", creadoEn: { lt: limite } },
    select: { id: true, referenciaPago: true, proveedorPago: true },
    take: 50,
  });
  for (const pedido of caducados) {
    if (pedido.proveedorPago === "stripe" && pedido.referenciaPago && cancelarIntento) {
      if (!(await cancelarIntento(pedido.referenciaPago))) continue;
    }
    await cancelarPedido(pedido.id);
  }
}

/**
 * Marca que se ha enviado el correo de confirmación. Devuelve true solo la primera vez,
 * así el correo no se manda dos veces aunque Stripe repita el aviso.
 */
export async function reservarCorreoConfirmacion(pedidoId: string): Promise<boolean> {
  const cambio = await db.pedido.updateMany({
    where: { id: pedidoId, correoConfirmacionEn: null },
    data: { correoConfirmacionEn: new Date() },
  });
  return cambio.count === 1;
}

/** Un pedido con sus líneas y sus códigos de activación (con los datos del kit) */
export function obtenerPedido(id: string) {
  return db.pedido.findUnique({
    where: { id },
    include: {
      lineas: true,
      codigos: {
        orderBy: { creadoEn: "asc" },
        include: { kit: { select: { nombre: true, slug: true, imagen: true } } },
      },
    },
  });
}

export type PedidoCompleto = NonNullable<Awaited<ReturnType<typeof obtenerPedido>>>;

/** Lee la lista de piezas guardada en una línea de robot personalizado */
export function piezasDeLinea(valor: unknown): PiezaLinea[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (p): p is PiezaLinea =>
      typeof p?.nombre === "string" &&
      typeof p?.cantidad === "number" &&
      typeof p?.slug === "string",
  );
}

/**
 * Pedidos de una cuenta: los hechos con la sesión iniciada y los que hizo como invitado
 * con el mismo email (su email está verificado, así que son suyos).
 */
export function pedidosDeUsuario(usuario: { id: string; email: string }) {
  return db.pedido.findMany({
    where: {
      OR: [{ usuarioId: usuario.id }, { usuarioId: null, email: usuario.email }],
      NOT: { estado: "PENDIENTE", proveedorPago: "simulado" },
    },
    orderBy: { creadoEn: "desc" },
    take: 100,
    select: {
      id: true,
      numero: true,
      estado: true,
      totalCentimos: true,
      creadoEn: true,
      numeroSeguimiento: true,
      _count: { select: { lineas: true } },
    },
  });
}
