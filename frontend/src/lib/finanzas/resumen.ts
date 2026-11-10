/**
 * RESUMEN DE FINANZAS (cálculo puro, sin base de datos; lo prueba resumen.test.ts)
 * A partir de los apuntes (ingresos y gastos a mano + pedidos cobrados en la web) saca
 * los totales, el beneficio, la evolución mes a mes y el reparto por categorías.
 */
import { mesEnEspana, nombreCategoria, type TipoMovimiento } from "@/config/finanzas";

/** Un ingreso o un gasto, venga de donde venga */
export interface Apunte {
  tipo: TipoMovimiento;
  categoria: string;
  /** Céntimos, IVA incluido, siempre positivo */
  importeCentimos: number;
  ivaCentimos: number;
  fecha: Date;
}

export interface Mes {
  mes: string;
  ingresos: number;
  gastos: number;
  /** ingresos − gastos del mes */
  beneficio: number;
  /** Suma de los beneficios desde el primer mes del periodo hasta este */
  acumulado: number;
}

export interface FilaCategoria {
  slug: string;
  nombre: string;
  cantidad: number;
}

export interface Resumen {
  ingresos: number;
  gastos: number;
  beneficio: number;
  /** Beneficio / ingresos, en % (null si no hay ingresos) */
  margen: number | null;
  ivaCobrado: number;
  ivaPagado: number;
  /** Beneficio sin contar el IVA (el IVA no es de la empresa: se cobra o se paga a Hacienda) */
  beneficioSinIva: number;
  numIngresos: number;
  numGastos: number;
  meses: Mes[];
  ingresosPorCategoria: FilaCategoria[];
  gastosPorCategoria: FilaCategoria[];
  /** Mes con más beneficio y con menos (null si no hay apuntes) */
  mejorMes: Mes | null;
  peorMes: Mes | null;
  /** Gasto medio de los meses que ya han pasado o están en curso */
  gastoMedioMensual: number;
}

function porCategoria(apuntes: Apunte[]): FilaCategoria[] {
  const suma = new Map<string, number>();
  for (const a of apuntes) suma.set(a.categoria, (suma.get(a.categoria) ?? 0) + a.importeCentimos);
  return [...suma]
    .map(([slug, cantidad]) => ({ slug, nombre: nombreCategoria(slug), cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/**
 * @param meses  meses del periodo, del más antiguo al más nuevo ("2026-01" …)
 * @param mesActual  para no contar como «vacíos» los meses que aún no han llegado
 */
export function resumirFinanzas(apuntes: Apunte[], meses: string[], mesActual: string): Resumen {
  const enPeriodo = new Set(meses);
  const dentro = apuntes.filter((a) => enPeriodo.has(mesEnEspana(a.fecha)));
  const ingresos = dentro.filter((a) => a.tipo === "INGRESO");
  const gastos = dentro.filter((a) => a.tipo === "GASTO");
  const suma = (lista: Apunte[], campo: "importeCentimos" | "ivaCentimos") =>
    lista.reduce((total, a) => total + a[campo], 0);

  const porMes = new Map(meses.map((m) => [m, { ingresos: 0, gastos: 0 }]));
  for (const a of dentro) {
    const fila = porMes.get(mesEnEspana(a.fecha))!;
    if (a.tipo === "INGRESO") fila.ingresos += a.importeCentimos;
    else fila.gastos += a.importeCentimos;
  }
  let acumulado = 0;
  const listaMeses: Mes[] = meses.map((mes) => {
    const { ingresos, gastos } = porMes.get(mes)!;
    acumulado += ingresos - gastos;
    return { mes, ingresos, gastos, beneficio: ingresos - gastos, acumulado };
  });

  const totalIngresos = suma(ingresos, "importeCentimos");
  const totalGastos = suma(gastos, "importeCentimos");
  const ivaCobrado = suma(ingresos, "ivaCentimos");
  const ivaPagado = suma(gastos, "ivaCentimos");
  const beneficio = totalIngresos - totalGastos;

  const conMovimiento = listaMeses.filter((m) => m.ingresos || m.gastos);
  const ordenados = [...conMovimiento].sort((a, b) => b.beneficio - a.beneficio);
  const mesesPasados = listaMeses.filter((m) => m.mes <= mesActual);
  // Los meses antes del primer apunte no cuentan para la media (la empresa aún no gastaba)
  const desde = mesesPasados.findIndex((m) => m.ingresos || m.gastos);
  const mesesParaMedia = desde === -1 ? [] : mesesPasados.slice(desde);

  return {
    ingresos: totalIngresos,
    gastos: totalGastos,
    beneficio,
    margen: totalIngresos > 0 ? (beneficio / totalIngresos) * 100 : null,
    ivaCobrado,
    ivaPagado,
    beneficioSinIva: totalIngresos - ivaCobrado - (totalGastos - ivaPagado),
    numIngresos: ingresos.length,
    numGastos: gastos.length,
    meses: listaMeses,
    ingresosPorCategoria: porCategoria(ingresos),
    gastosPorCategoria: porCategoria(gastos),
    mejorMes: ordenados[0] ?? null,
    peorMes: ordenados.length > 1 ? ordenados[ordenados.length - 1] : null,
    gastoMedioMensual: mesesParaMedia.length
      ? Math.round(mesesParaMedia.reduce((t, m) => t + m.gastos, 0) / mesesParaMedia.length)
      : 0,
  };
}
