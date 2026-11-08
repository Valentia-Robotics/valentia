/**
 * CARRITO DE LA COMPRA
 * Usa Zustand (un "almacén" de datos compartido entre componentes) y lo guarda
 * en el navegador (localStorage) para que no se pierda al recargar la página.
 *
 * Lo usan el contador de la barra de navegación, la página /carrito y el checkout.
 */
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { KITS_RENOMBRADOS, slugKitActual } from "@/config/kitsRenombrados";
import type { ArticuloCarrito } from "@/types/carrito";

const CANTIDAD_MAXIMA = 99;

interface EstadoCarrito {
  articulos: ArticuloCarrito[];
  /** Añade un artículo. Si ya estaba, suma la cantidad. */
  anadir: (articulo: Omit<ArticuloCarrito, "cantidad">, cantidad?: number) => void;
  /** Cambia la cantidad de un artículo. Si llega a 0, lo quita. */
  cambiarCantidad: (id: string, cantidad: number) => void;
  quitar: (id: string) => void;
  /** Pone los precios que manda el servidor (si han cambiado desde que se añadieron) */
  actualizarPrecios: (precios: { id: string; precioCentimos: number }[]) => void;
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

      actualizarPrecios: (precios) =>
        set((estado) => {
          const nuevo = new Map(precios.map((p) => [p.id, p.precioCentimos]));
          return {
            articulos: estado.articulos.map((a) => ({
              ...a,
              precioCentimos: nuevo.get(a.id) ?? a.precioCentimos,
            })),
          };
        }),

      vaciar: () => set({ articulos: [] }),
    }),
    {
      name: "valentia-carrito", // nombre con el que se guarda en el navegador
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // Carritos guardados con la versión 1 (antes de la fase 4): rellenamos slug y piezas a partir del id
      migrate: (guardado, version) => {
        const estado = guardado as { articulos?: ArticuloCarrito[] };
        if (version < 2) {
          estado.articulos = (estado.articulos ?? []).map(completarArticuloAntiguo);
        }
        // Versión 3: kits que cambiaron de slug (src/config/kitsRenombrados.ts)
        if (version < 3) {
          estado.articulos = (estado.articulos ?? []).map(actualizarKitRenombrado);
        }
        return estado as EstadoCarrito;
      },
    },
  ),
);

/** Saca slug y piezas del id (kit:slug, componente:slug, configuracion:slugx2+otro-slugx1) */
function completarArticuloAntiguo(a: ArticuloCarrito): ArticuloCarrito {
  const resto = a.id.slice(a.id.indexOf(":") + 1);
  if (a.tipo === "configuracion") {
    const piezas = resto.split("+").map((parte) => {
      const corte = parte.lastIndexOf("x");
      return { slug: parte.slice(0, corte), cantidad: Number(parte.slice(corte + 1)) };
    });
    return { ...a, piezas };
  }
  return { ...a, slug: resto };
}

/** Pone el slug nuevo (y su id y su foto) a un kit guardado con el slug viejo */
function actualizarKitRenombrado(a: ArticuloCarrito): ArticuloCarrito {
  if (a.tipo !== "kit" || !a.slug || !Object.hasOwn(KITS_RENOMBRADOS, a.slug)) return a;
  const nuevo = slugKitActual(a.slug);
  return {
    ...a,
    id: `kit:${nuevo}`,
    slug: nuevo,
    imagen: a.imagen?.replace(`/${a.slug}.`, `/${nuevo}.`),
  };
}

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
