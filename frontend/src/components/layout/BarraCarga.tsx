"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Si la página nunca llega (sin conexión, por ejemplo), la barra no se queda puesta */
const TIEMPO_MAXIMO_MS = 10_000;

/**
 * Raya azul arriba mientras carga la página siguiente: el clic responde al momento aunque el servidor
 * tarde. Solo aparece pasados 150 ms (globals.css): en las páginas ya precargadas ni se ve.
 */
export function BarraCarga() {
  const ruta = usePathname();
  /** La ruta desde la que se ha pulsado un enlace: la barra se ve mientras sigamos en ella */
  const [origen, setOrigen] = useState<string | null>(null);

  if (origen !== null && origen !== ruta) setOrigen(null);

  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout>;
    const alPulsar = (evento: MouseEvent) => {
      // <Link> cancela el clic normal para navegar sin recargar: los demás enlaces no cuentan
      if (!evento.defaultPrevented || !(evento.target instanceof Element)) return;
      const enlace = evento.target.closest<HTMLAnchorElement>("a[href]");
      if (!enlace || enlace.pathname === window.location.pathname) return;
      setOrigen(window.location.pathname);
      clearTimeout(reloj);
      reloj = setTimeout(() => setOrigen(null), TIEMPO_MAXIMO_MS);
    };
    document.addEventListener("click", alPulsar);
    return () => {
      document.removeEventListener("click", alPulsar);
      clearTimeout(reloj);
    };
  }, []);

  if (origen === null) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[70] h-0.5 origin-left animate-carga bg-acento print:hidden"
    />
  );
}
