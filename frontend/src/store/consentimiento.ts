/**
 * CONSENTIMIENTO DE COOKIES
 * Guarda en el navegador lo que la persona eligió en el banner de cookies.
 *   - Necesarias (sesión, carrito, seguridad, pago): siempre activas, no hace falta permiso.
 *   - videos: reproductores de YouTube y Vimeo de los cursos (ponen cookies de terceros).
 *   - analitica: Google Analytics, solo si existe NEXT_PUBLIC_GA_ID (src/config/analitica.ts).
 * Ninguna cookie opcional se carga hasta que se acepta. Se vuelve a preguntar a los 12 meses
 * o si cambia VERSION (por ejemplo, al añadir una categoría nueva como "analítica").
 */
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { hayAnalitica } from "@/config/analitica";

/**
 * Súbela si cambian las categorías: se volverá a preguntar a todo el mundo. Con Google Analytics
 * configurado es la 2 (hay una categoría nueva y hay que pedir permiso para ella).
 */
const VERSION = hayAnalitica ? 2 : 1;

const NADA: Preferencias = { videos: false, analitica: false };
const DOCE_MESES = 365 * 24 * 60 * 60 * 1000;

export interface Preferencias {
  videos: boolean;
  analitica: boolean;
}

interface EstadoConsentimiento {
  /** Cuándo eligió (null = todavía no ha elegido) */
  decididoEn: number | null;
  preferencias: Preferencias;
  /** El panel de configuración está abierto (desde el banner o el pie de página) */
  panelAbierto: boolean;
  guardar: (preferencias: Preferencias) => void;
  aceptarTodo: () => void;
  rechazarTodo: () => void;
  abrirPanel: () => void;
  cerrarPanel: () => void;
}

export const useConsentimiento = create<EstadoConsentimiento>()(
  persist(
    (set) => ({
      decididoEn: null,
      preferencias: NADA,
      panelAbierto: false,
      guardar: (preferencias) => set({ preferencias, decididoEn: Date.now(), panelAbierto: false }),
      aceptarTodo: () =>
        set({
          preferencias: { videos: true, analitica: hayAnalitica },
          decididoEn: Date.now(),
          panelAbierto: false,
        }),
      rechazarTodo: () =>
        set({ preferencias: NADA, decididoEn: Date.now(), panelAbierto: false }),
      abrirPanel: () => set({ panelAbierto: true }),
      cerrarPanel: () => set({ panelAbierto: false }),
    }),
    {
      name: "valentia-consentimiento",
      version: VERSION,
      storage: createJSONStorage(() => localStorage),
      // Solo se guarda la elección (no si el panel está abierto)
      partialize: ({ decididoEn, preferencias }) => ({ decididoEn, preferencias }),
      // Si cambia la versión, se descarta la elección anterior y se vuelve a preguntar
      migrate: () => ({ decididoEn: null, preferencias: NADA }),
      // Al leer la elección guardada: si tiene más de 12 meses, se descarta y se vuelve a preguntar
      merge: (guardado, actual) => {
        const elegido = guardado as Partial<EstadoConsentimiento> | undefined;
        if (!elegido || hayQuePreguntar(elegido.decididoEn ?? null)) return actual;
        // Una elección antigua sin «analitica» cuenta como «no»
        return { ...actual, ...elegido, preferencias: { ...NADA, ...elegido.preferencias } };
      },
    },
  ),
);

/** true cuando ya se ha leído la elección guardada (antes, no se enseña nada para no parpadear) */
export function useConsentimientoHidratado(): boolean {
  return useSyncExternalStore(
    (avisar) => useConsentimiento.persist.onFinishHydration(avisar),
    () => useConsentimiento.persist.hasHydrated(),
    () => false,
  );
}

/** ¿Hay que enseñar el banner? (no ha elegido o su elección tiene más de 12 meses) */
export function hayQuePreguntar(decididoEn: number | null, ahora = Date.now()): boolean {
  return decididoEn === null || ahora - decididoEn > DOCE_MESES;
}
