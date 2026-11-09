"use client";

import { useAvisosEquipo } from "@/store/avisosEquipo";

/** El número de mensajes sin leer junto a «Mensajes» en el menú del panel (lo rellena AvisosEquipo) */
export function ContadorMensajes({ activo }: { activo: boolean }) {
  const total = useAvisosEquipo((e) => e.total);
  if (total === 0) return null;
  return (
    <span
      aria-label={`${total} sin leer`}
      className={
        "ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold " +
        (activo ? "bg-white text-tinta" : "bg-acento text-white")
      }
    >
      {total > 99 ? "99+" : total}
    </span>
  );
}
