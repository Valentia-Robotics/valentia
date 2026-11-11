/**
 * ACCIONES DE LA EMPRESA (/admin/acciones, solo ADMIN y SIGMA)
 * Junta el valor escrito a mano (ValoracionEmpresa) con el calculado con los datos de la web:
 * beneficio de siempre sin IVA (Finanzas) + stock del almacén. Las reglas están en src/config/acciones.ts.
 */
import "server-only";
import { valorCalculado } from "@/config/acciones";
import { leerPeriodo } from "@/config/finanzas";
import { obtenerFinanzas } from "@/lib/admin/finanzas";
import { db } from "@/lib/db";

export async function obtenerAcciones() {
  const [finanzas, kits, componentes, valoraciones] = await Promise.all([
    obtenerFinanzas(leerPeriodo("todo")),
    db.kit.findMany({ select: { precioCentimos: true, stock: true } }),
    db.componente.findMany({ select: { precioCentimos: true, stock: true } }),
    db.valoracionEmpresa.findMany({ orderBy: { creadoEn: "desc" }, take: 50 }),
  ]);
  return {
    calculado: valorCalculado(finanzas.resumen.beneficioSinIva, [...kits, ...componentes]),
    /** La última valoración a mano (null si aún no hay ninguna) */
    actual: valoraciones[0] ?? null,
    historial: valoraciones,
  };
}
