/**
 * CÓDIGOS DE ACTIVACIÓN (panel): lista con filtros, lotes y generación en bloque.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { generarCodigoActivacion } from "@/lib/codigos";
import { textoContiene } from "@/lib/busqueda";
import { db, transaccion } from "@/lib/db";
import { esId } from "@/lib/ids";

export const CODIGOS_POR_PAGINA = 50;
/** Máximo de códigos que se pueden generar de una vez */
export const MAXIMO_LOTE = 500;

export type EstadoCodigo = "libre" | "usado" | "desactivado";

/** Condición de la base de datos para cada estado */
const condicionEstado: Record<EstadoCodigo, Prisma.CodigoActivacionWhereInput> = {
  libre: { usadoEn: null, desactivadoEn: null },
  usado: { usadoEn: { not: null } },
  desactivado: { desactivadoEn: { not: null } },
};

/** Códigos que coinciden con los filtros, del más nuevo al más antiguo */
export async function listarCodigos(filtros: {
  q: string;
  kitId?: string;
  estado?: EstadoCodigo;
  loteId?: string;
  pagina: number;
}) {
  const q = filtros.q.trim();
  const where: Prisma.CodigoActivacionWhereInput = {
    // Un id con otra forma (dirección manipulada) se ignora en vez de dar error
    ...(esId(filtros.kitId) && { kitId: filtros.kitId }),
    ...(esId(filtros.loteId) && { loteId: filtros.loteId }),
    ...(filtros.estado && condicionEstado[filtros.estado]),
    // Se busca por el código o por el email de quien lo activó
    ...(q && {
      OR: [
        { codigo: textoContiene(q.toUpperCase()) },
        { usuario: { email: textoContiene(q.toLowerCase()) } },
      ],
    }),
  };

  const [total, codigos] = await Promise.all([
    db.codigoActivacion.count({ where }),
    db.codigoActivacion.findMany({
      where,
      orderBy: [{ creadoEn: "desc" }, { codigo: "asc" }],
      skip: (filtros.pagina - 1) * CODIGOS_POR_PAGINA,
      take: CODIGOS_POR_PAGINA,
      select: {
        id: true,
        codigo: true,
        creadoEn: true,
        usadoEn: true,
        desactivadoEn: true,
        kit: { select: { nombre: true } },
        usuario: { select: { nombre: true, email: true } },
        pedido: { select: { id: true, numero: true } },
        loteId: true,
      },
    }),
  ]);
  return {
    codigos,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / CODIGOS_POR_PAGINA)),
  };
}

/** Cifras de los códigos (para la cabecera de la página) */
export async function resumenCodigos() {
  const [generados, usados, desactivados] = await Promise.all([
    db.codigoActivacion.count(),
    db.codigoActivacion.count({ where: condicionEstado.usado }),
    db.codigoActivacion.count({ where: condicionEstado.desactivado }),
  ]);
  return { generados, usados, desactivados };
}

/** Los últimos lotes generados, con cuántos de sus códigos se han usado */
export async function ultimosLotes(cantidad = 10) {
  const lotes = await db.loteCodigos.findMany({
    orderBy: { creadoEn: "desc" },
    take: cantidad,
    select: {
      id: true,
      cantidad: true,
      creadoEn: true,
      kit: { select: { nombre: true } },
      _count: { select: { codigos: { where: { usadoEn: { not: null } } } } },
    },
  });
  return lotes.map((l) => ({ ...l, usados: l._count.codigos }));
}

/** Un lote con todos sus códigos, para imprimir las tarjetas */
export function obtenerLote(id: string) {
  return db.loteCodigos.findUnique({
    where: { id },
    include: {
      kit: { select: { id: true, nombre: true } },
      codigos: {
        orderBy: { codigo: "asc" },
        select: { id: true, codigo: true, usadoEn: true, desactivadoEn: true },
      },
    },
  });
}

/**
 * Crea un lote de códigos nuevos para un kit (todo o nada).
 * Los códigos se generan al azar; si alguno coincide con uno que ya existe, se cambia por otro.
 */
export async function crearLote(kitId: string, cantidad: number) {
  return transaccion(async (tx) => {
    const codigos = new Set<string>();
    // Repetimos hasta tener "cantidad" códigos que no existan todavía
    for (let intento = 0; codigos.size < cantidad && intento < 10; intento++) {
      const candidatos = new Set<string>();
      while (candidatos.size + codigos.size < cantidad) {
        const codigo = generarCodigoActivacion();
        if (!codigos.has(codigo)) candidatos.add(codigo);
      }
      const repetidos = await tx.codigoActivacion.findMany({
        where: { codigo: { in: [...candidatos] } },
        select: { codigo: true },
      });
      const ocupados = new Set(repetidos.map((r) => r.codigo));
      for (const c of candidatos) if (!ocupados.has(c)) codigos.add(c);
    }
    if (codigos.size < cantidad) throw new Error("No se pudieron generar códigos únicos");

    const lote = await tx.loteCodigos.create({ data: { kitId, cantidad } });
    await tx.codigoActivacion.createMany({
      data: [...codigos].map((codigo) => ({ codigo, kitId, loteId: lote.id })),
    });
    return lote.id;
  });
}
