/**
 * PEDIDOS
 * Todo lo que pasa en el servidor al comprar:
 *   1. calcularLineas      → vuelve a calcular los precios con la base de datos
 *   2. crearPedido         → comprueba y descuenta el stock y guarda el pedido (PENDIENTE)
 *   3. marcarPedidoPagado  → lo marca como PAGADO y crea un código de activación por cada kit
 *   4. cancelarPedido      → si el pago falla, lo cancela y devuelve el stock
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { generarCodigoActivacion, generarNumeroPedido } from "@/lib/codigos";
import { db } from "@/lib/db";
import type { ArticuloPedido, DatosCliente } from "@/lib/validaciones/pedido";

type Tx = Prisma.TransactionClient;

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
    tx.kit.findMany({ where: { slug: { in: slugsKits } } }),
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

  const totalCentimos = lineas.reduce((t, l) => t + l.precioUnitarioCentimos * l.cantidad, 0);
  return { lineas, totalCentimos, salidas, componentePorSlug };
}

/**
 * Precios reales de un carrito, sin guardar nada (para avisar si han cambiado).
 * "precios" va en el mismo orden que los artículos: precio de una unidad de cada uno.
 */
export function calcularPrecios(articulos: ArticuloPedido[]) {
  return db.$transaction(async (tx) => {
    const { lineas, totalCentimos } = await calcularLineas(tx, articulos);
    return { totalCentimos, precios: lineas.map((l) => l.precioUnitarioCentimos) };
  });
}

/** Guarda el pedido como PENDIENTE y descuenta el stock. Todo o nada (transacción). */
export async function crearPedido(
  cliente: DatosCliente,
  articulos: ArticuloPedido[],
  proveedorPago: string,
) {
  return db.$transaction(async (tx) => {
    const { lineas, totalCentimos, salidas, componentePorSlug } = await calcularLineas(
      tx,
      articulos,
    );

    // Descontamos el stock solo si queda suficiente (comprobación y resta a la vez)
    for (const [slug, unidades] of salidas) {
      const resultado = await tx.componente.updateMany({
        where: { slug, stock: { gte: unidades } },
        data: { stock: { decrement: unidades } },
      });
      if (resultado.count === 0) {
        const componente = componentePorSlug.get(slug);
        throw new ErrorPedido(
          `No nos quedan suficientes unidades de «${componente?.nombre ?? slug}» (quedan ${componente?.stock ?? 0}).`,
        );
      }
    }

    return tx.pedido.create({
      data: {
        numero: generarNumeroPedido(),
        ...cliente,
        totalCentimos,
        proveedorPago,
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

/**
 * Marca el pedido como PAGADO y crea un código de activación por cada kit (uno por unidad).
 * Los robots personalizados y los componentes sueltos no llevan código ni curso.
 * Se puede llamar dos veces sin problema (Stripe a veces avisa más de una vez).
 */
export async function marcarPedidoPagado(pedidoId: string, referenciaPago: string) {
  await db.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { lineas: true },
    });
    if (!pedido) throw new Error(`No existe el pedido ${pedidoId}`);
    if (pedido.estado === "PAGADO") return;

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

    await tx.codigoActivacion.createMany({ data: codigos });
    await tx.pedido.update({
      where: { id: pedidoId },
      data: { estado: "PAGADO", pagadoEn: new Date(), referenciaPago },
    });
  });
}

/** Si el pago no se completa: cancela el pedido y devuelve las piezas al almacén */
export async function cancelarPedido(pedidoId: string) {
  await db.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { lineas: true },
    });
    if (!pedido || pedido.estado !== "PENDIENTE") return;

    for (const linea of pedido.lineas) {
      const devolver: { slug: string; unidades: number }[] =
        linea.tipo === "COMPONENTE" && linea.slug
          ? [{ slug: linea.slug, unidades: linea.cantidad }]
          : linea.tipo === "CONFIGURACION"
            ? ((linea.piezas as PiezaLinea[] | null) ?? []).map((p) => ({
                slug: p.slug,
                unidades: p.cantidad * linea.cantidad,
              }))
            : [];
      for (const { slug, unidades } of devolver) {
        await tx.componente.updateMany({
          where: { slug },
          data: { stock: { increment: unidades } },
        });
      }
    }
    await tx.pedido.update({ where: { id: pedidoId }, data: { estado: "CANCELADO" } });
  });
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
    (p): p is PiezaLinea => typeof p?.nombre === "string" && typeof p?.cantidad === "number",
  );
}
