/**
 * ROBOT DEL CONFIGURADOR
 * Guarda las piezas que el usuario va eligiendo en el configurador.
 * Igual que el carrito, se guarda en el navegador para no perderlo al recargar.
 */
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { slugKitActual } from "@/config/kitsRenombrados";
import type { PiezaRobot } from "@/types/catalogo";

const CANTIDAD_MAXIMA = 99;

interface EstadoConfigurador {
  /** Cuántas unidades hay de cada pieza: { "servo-sg90": 4, … } */
  piezas: Record<string, number>;
  /** slug del kit desde el que se empezó, o null si se empezó desde cero */
  kitOrigen: string | null;
  /** Última pieza añadida (sirve para animarla en el panel). "vez" cambia en cada clic. */
  ultimaAnadida: { slug: string; vez: number } | null;

  /** Suma unidades de una pieza, sin pasar del máximo (stock disponible) */
  anadir: (slug: string, cantidad: number, maximo: number) => void;
  /** Cambia las unidades de una pieza. Con 0 o menos, la quita. */
  cambiarCantidad: (slug: string, cantidad: number, maximo: number) => void;
  /** Sustituye el robot por las piezas de un kit */
  cargarKit: (slug: string, piezas: PiezaRobot[]) => void;
  vaciar: () => void;
}

export const useConfigurador = create<EstadoConfigurador>()(
  persist(
    (set) => ({
      piezas: {},
      kitOrigen: null,
      ultimaAnadida: null,

      anadir: (slug, cantidad, maximo) =>
        set((estado) => {
          const tope = Math.min(maximo, CANTIDAD_MAXIMA);
          const nueva = Math.min((estado.piezas[slug] ?? 0) + cantidad, tope);
          if (nueva <= 0) return estado;
          return {
            piezas: { ...estado.piezas, [slug]: nueva },
            ultimaAnadida: { slug, vez: (estado.ultimaAnadida?.vez ?? 0) + 1 },
          };
        }),

      cambiarCantidad: (slug, cantidad, maximo) =>
        set((estado) => {
          const piezas = { ...estado.piezas };
          if (cantidad <= 0) delete piezas[slug];
          else piezas[slug] = Math.min(cantidad, maximo, CANTIDAD_MAXIMA);
          // Si el robot se queda vacío, ya no está "basado en" ningún kit
          const vacio = Object.keys(piezas).length === 0;
          return { piezas, kitOrigen: vacio ? null : estado.kitOrigen };
        }),

      cargarKit: (slug, lista) =>
        set({
          piezas: Object.fromEntries(lista.map((p) => [p.slug, p.cantidad])),
          kitOrigen: slug,
          ultimaAnadida: null,
        }),

      vaciar: () => set({ piezas: {}, kitOrigen: null, ultimaAnadida: null }),
    }),
    {
      name: "valentia-configurador",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Versión 2: el kit de partida puede tener un slug viejo (src/config/kitsRenombrados.ts)
      migrate: (guardado) => {
        const estado = guardado as Pick<EstadoConfigurador, "piezas" | "kitOrigen">;
        if (estado.kitOrigen) estado.kitOrigen = slugKitActual(estado.kitOrigen);
        return estado as EstadoConfigurador;
      },
      // La animación no se guarda: solo las piezas y el kit de partida
      partialize: (estado) => ({ piezas: estado.piezas, kitOrigen: estado.kitOrigen }),
    },
  ),
);

/** true cuando el robot ya se ha leído del navegador (ver useCarritoHidratado) */
export function useConfiguradorHidratado(): boolean {
  return useSyncExternalStore(
    (avisar) => useConfigurador.persist.onFinishHydration(avisar),
    () => useConfigurador.persist.hasHydrated(),
    () => false,
  );
}
