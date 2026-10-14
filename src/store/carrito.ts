/**
 * CARRITO DE LA COMPRA
 * Usa Zustand (un "almacén" de datos compartido entre componentes) y lo guarda
 * en el navegador (localStorage) para que no se pierda al recargar la página.
 *
 * En la fase 1 solo lo usamos para el contador de la barra de navegación.
 * En la fase 4 lo conectaremos con la página del carrito y el checkout.
 */
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ArticuloCarrito } from "@/types/carrito";

const CANTIDAD_MAXIMA = 99;

interface EstadoCarrito {
  articulos: ArticuloCarrito[];
  /** Añade un artículo. Si ya estaba, suma la cantidad. */
  anadir: (articulo: Omit<ArticuloCarrito, "cantidad">, cantidad?: number) => void;
  /** Cambia la cantidad de un artículo. Si llega a 0, lo quita. */
  cambiarCantidad: (id: string, cantidad: number) => void;
  quitar: (id: string) => void;
  vaciar: () => void;
}

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set) => ({
      articulos: [],

      anadir: (articulo, cantidad = 1) =>
        set((estado) => {
          const existente = estado.articulos.find((a) => a.id === articulo.id);
          if (existente) {
            return {
              articulos: estado.articulos.map((a) =>
                a.id === articulo.id
                  ? { ...a, cantidad: Math.min(a.cantidad + cantidad, CANTIDAD_MAXIMA) }
                  : a,
              ),
            };
          }
          return { articulos: [...estado.articulos, { ...articulo, cantidad }] };
        }),

      cambiarCantidad: (id, cantidad) =>
        set((estado) => ({
          articulos:
            cantidad <= 0
              ? estado.articulos.filter((a) => a.id !== id)
              : estado.articulos.map((a) =>
                  a.id === id ? { ...a, cantidad: Math.min(cantidad, CANTIDAD_MAXIMA) } : a,
                ),
        })),

      quitar: (id) => set((estado) => ({ articulos: estado.articulos.filter((a) => a.id !== id) })),

      vaciar: () => set({ articulos: [] }),
    }),
    {
      name: "valentia-carrito", // nombre con el que se guarda en el navegador
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/* ---------- Cálculos (selectores) ---------- */

export const seleccionarTotalArticulos = (estado: EstadoCarrito) =>
  estado.articulos.reduce((total, a) => total + a.cantidad, 0);

export const seleccionarTotalCentimos = (estado: EstadoCarrito) =>
  estado.articulos.reduce((total, a) => total + a.precioCentimos * a.cantidad, 0);

/**
 * Devuelve true cuando el carrito ya se ha leído del navegador.
 * Hasta entonces mostramos el carrito vacío para que el servidor y el navegador
 * pinten lo mismo (si no, React avisa de un error de "hidratación").
 */
export function useCarritoHidratado(): boolean {
  return useSyncExternalStore(
    (avisar) => useCarrito.persist.onFinishHydration(avisar),
    () => useCarrito.persist.hasHydrated(),
    () => false,
  );
}
