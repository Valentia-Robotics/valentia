/**
 * FINANZAS DEL PANEL (/admin/finanzas, solo ADMIN)
 * Junta los ingresos y gastos apuntados a mano (MovimientoDinero) con los pedidos cobrados en la
 * web, que cuentan solos como ingreso. Los cálculos están en src/lib/finanzas/resumen.ts.
 */
import "server-only";
import {
  CATEGORIA_VENTAS_WEB,
  mesEnEspana,
  mesesDelPeriodo,
  sumarMeses,
  type Periodo,
  type TipoMovimiento,
} from "@/config/finanzas";
import { db } from "@/lib/db";
import { resumirFinanzas, type Apunte } from "@/lib/finanzas/resumen";
import { PEDIDO_COBRADO } from "@/lib/pedidos";

/** Una fila de la lista de movimientos (los pedidos no se editan: se ven en Pedidos) */
export interface Movimiento extends Apunte {
  id: string;
  concepto: string;
  contraparte: string;
  /** "manual" = apuntado en el panel; "pedido" = pedido de la web */
  origen: "manual" | "pedido";
  /** Enlace para verlo o cambiarlo */
  href: string;
}

/** Primer día (aprox.) de un mes y último, con un día de margen: luego se filtra por mes en España */
function rangoDeMeses(meses: string[]) {
  const desde = new Date(`${meses[0]}-01T00:00:00Z`);
  desde.setUTCDate(desde.getUTCDate() - 1);
  const hasta = new Date(`${sumarMeses(meses[meses.length - 1], 1)}-01T00:00:00Z`);
  hasta.setUTCDate(hasta.getUTCDate() + 1);
  return { gte: desde, lt: hasta };
}

async function primerMes(): Promise<string | undefined> {
  const [movimiento, pedido] = await Promise.all([
    db.movimientoDinero.findFirst({ orderBy: { fecha: "asc" }, select: { fecha: true } }),
    db.pedido.findFirst({
      where: PEDIDO_COBRADO,
      orderBy: { pagadoEn: "asc" },
      select: { pagadoEn: true },
    }),
  ]);
  const fechas = [movimiento?.fecha, pedido?.pagadoEn].filter((f): f is Date => !!f);
  if (fechas.length === 0) return undefined;
  return mesEnEspana(new Date(Math.min(...fechas.map((f) => f.getTime()))));
}

/** Años que se pueden elegir: desde el primer apunte hasta el actual */
function aniosDisponibles(primero: string | undefined, mesActual: string): number[] {
  const actual = Number(mesActual.slice(0, 4));
  const desde = primero ? Number(primero.slice(0, 4)) : actual;
  return Array.from({ length: actual - desde + 1 }, (_, i) => actual - i);
}

export async function obtenerFinanzas(periodo: Periodo) {
  const mesActual = mesEnEspana(new Date());
  const primero = await primerMes();
  const meses = mesesDelPeriodo(periodo, mesActual, primero);
  const rango = rangoDeMeses(meses);

  const [manuales, pedidos] = await Promise.all([
    db.movimientoDinero.findMany({ where: { fecha: rango }, orderBy: { fecha: "desc" } }),
    db.pedido.findMany({
      where: { ...PEDIDO_COBRADO, pagadoEn: rango },
      orderBy: { pagadoEn: "desc" },
      select: {
        id: true,
        numero: true,
        nombre: true,
        totalCentimos: true,
        ivaCentimos: true,
        pagadoEn: true,
      },
    }),
  ]);

  const enPeriodo = new Set(meses);
  const movimientos: Movimiento[] = [
    ...manuales.map((m) => ({
      id: m.id,
      tipo: m.tipo as TipoMovimiento,
      categoria: m.categoria,
      importeCentimos: m.importeCentimos,
      ivaCentimos: m.ivaCentimos,
      fecha: m.fecha,
      concepto: m.concepto,
      contraparte: m.contraparte,
      origen: "manual" as const,
      href: `/admin/finanzas/${m.id}`,
    })),
    ...pedidos.map((p) => ({
      id: p.id,
      tipo: "INGRESO" as const,
      categoria: CATEGORIA_VENTAS_WEB.slug,
      importeCentimos: p.totalCentimos,
      ivaCentimos: p.ivaCentimos,
      fecha: p.pagadoEn!,
      concepto: `Pedido ${p.numero}`,
      contraparte: p.nombre,
      origen: "pedido" as const,
      href: `/admin/pedidos/${p.id}`,
    })),
  ]
    .filter((m) => enPeriodo.has(mesEnEspana(m.fecha)))
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return {
    periodo,
    meses,
    mesActual,
    anios: aniosDisponibles(primero, mesActual),
    resumen: resumirFinanzas(movimientos, meses, mesActual),
    movimientos,
    pedidosWeb: pedidos.length,
  };
}

export type DatosFinanzas = Awaited<ReturnType<typeof obtenerFinanzas>>;
