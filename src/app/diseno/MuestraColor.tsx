"use client";

import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};

/**
 * Muestra un color del sistema de diseño. El valor (#xxxxxx) se lee directamente
 * de globals.css, así que si cambias un color allí, aquí se actualiza solo.
 */
export function MuestraColor({
  variable,
  nombre,
  uso,
}: {
  variable: string;
  nombre: string;
  uso: string;
}) {
  const valor = useSyncExternalStore(
    sinSuscripcion,
    () => getComputedStyle(document.documentElement).getPropertyValue(variable).trim(),
    () => "",
  );

  return (
    <li className="overflow-hidden rounded-tarjeta border border-linea bg-white shadow-tarjeta">
      <div className="h-24 border-b border-linea" style={{ backgroundColor: `var(${variable})` }} />
      <div className="p-4">
        <p className="font-medium">{nombre}</p>
        <p className="mt-1 font-mono text-xs text-gris">
          {variable} {valor && `· ${valor.toUpperCase()}`}
        </p>
        <p className="mt-2 text-sm text-gris">{uso}</p>
      </div>
    </li>
  );
}
