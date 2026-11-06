"use client";

import { useMemo } from "react";
import { comprobarRobot, type Diagnostico, type PiezaConDatos } from "@/lib/compatibilidad";
import { useConfigurador, useConfiguradorHidratado } from "@/store/configurador";
import type { Categoria, ComponenteCatalogo } from "@/types/catalogo";

export interface Robot {
  /** false mientras se lee el robot guardado en el navegador */
  hidratado: boolean;
  piezas: PiezaConDatos[];
  totalCentimos: number;
  totalPiezas: number;
  diagnostico: Diagnostico;
  /** Cuántas piezas hay de cada categoría (para los contadores de las categorías) */
  porCategoria: Partial<Record<Categoria, number>>;
  /** Unidades de una pieza en el robot (0 si no está) */
  cantidadDe: (slug: string) => number;
}

/**
 * Junta las piezas guardadas en el configurador con sus datos del catálogo
 * y calcula el total, el número de piezas y los avisos de compatibilidad.
 */
export function useRobot(componentes: ComponenteCatalogo[]): Robot {
  const hidratado = useConfiguradorHidratado();
  const guardadas = useConfigurador((estado) => estado.piezas);

  // Posición de cada componente en el catálogo, para ordenar el robot igual (por categoría)
  const indice = useMemo(
    () => new Map(componentes.map((c, posicion) => [c.slug, { c, posicion }])),
    [componentes],
  );

  return useMemo(() => {
    const entradas = hidratado ? Object.entries(guardadas) : [];
    const piezas = entradas
      .flatMap(([slug, cantidad]) => {
        const encontrado = indice.get(slug);
        // Si una pieza guardada ya no existe en el catálogo, la ignoramos
        return encontrado
          ? [{ componente: encontrado.c, cantidad, posicion: encontrado.posicion }]
          : [];
      })
      .sort((a, b) => a.posicion - b.posicion)
      .map(({ componente, cantidad }) => ({ componente, cantidad }));

    const porCategoria: Partial<Record<Categoria, number>> = {};
    for (const p of piezas) {
      porCategoria[p.componente.categoria] =
        (porCategoria[p.componente.categoria] ?? 0) + p.cantidad;
    }

    return {
      hidratado,
      piezas,
      totalCentimos: piezas.reduce((t, p) => t + p.componente.precioCentimos * p.cantidad, 0),
      totalPiezas: piezas.reduce((t, p) => t + p.cantidad, 0),
      diagnostico: comprobarRobot(piezas),
      porCategoria,
      cantidadDe: (slug: string) => (hidratado ? (guardadas[slug] ?? 0) : 0),
    };
  }, [hidratado, guardadas, indice]);
}

/** Lo máximo que se puede pedir de una pieza: lo que hay en el almacén */
export function maximoDe(componente: ComponenteCatalogo): number {
  return Math.min(componente.stock, 99);
}
