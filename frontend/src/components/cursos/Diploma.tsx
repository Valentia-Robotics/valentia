"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Logo } from "@/components/marca/Logo";
import { Boton } from "@/components/ui/Boton";

interface Props {
  nombre: string;
  curso: string;
  kit: string | null;
  lecciones: number;
  /** Fecha ya escrita ("29 de octubre de 2026") */
  fecha: string;
}

/**
 * DIPLOMA de fin de curso. Se ve en la pantalla y se descarga con «Guardar como PDF» del
 * navegador (A4 apaisado, sin la barra ni el pie de la web). El nombre se puede cambiar
 * antes de descargarlo: muchas veces la cuenta es del padre o del profe y el curso lo hizo otro.
 * Los tamaños van en "cqw" (porcentaje del ancho del diploma) para que se vea igual en el móvil.
 */
export function Diploma({ nombre: inicial, curso, kit, lecciones, fecha }: Props) {
  const [nombre, setNombre] = useState(inicial);

  return (
    <>
      {/* Al imprimir: una sola hoja A4 apaisada y sin márgenes */}
      <style>{`@page { size: A4 landscape; margin: 0; }`}</style>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end print:hidden">
        <label className="flex-1">
          <span className="text-sm font-medium">Nombre que saldrá en el diploma</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={40}
            className="mt-1.5 h-12 w-full rounded-boton px-4 ring-1 ring-linea outline-none focus:ring-2 focus:ring-acento"
          />
          <span className="mt-1.5 block text-xs text-gris">
            Si el curso lo ha hecho otra persona (tu hija, un alumno…), pon aquí su nombre.
          </span>
        </label>
        <div className="sm:mb-6">
          <Boton type="button" variante="acento" onClick={() => window.print()}>
            <Download aria-hidden="true" className="size-4" />
            Descargar en PDF
          </Boton>
        </div>
      </div>

      <div
        className="@container mx-auto aspect-[297/210] w-full max-w-4xl bg-white shadow-flotante ring-1 ring-linea print:aspect-auto print:h-[210mm] print:w-[297mm] print:max-w-none print:shadow-none print:ring-0"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <div className="relative flex h-full flex-col items-center p-[4cqw] text-center">
          {/* Marco: una línea fina y, dentro, otra más fina */}
          <div aria-hidden="true" className="absolute inset-[2cqw] border border-tinta" />
          <div aria-hidden="true" className="absolute inset-[2.6cqw] border border-linea" />
          <Pistas className="absolute top-[2.6cqw] left-[2.6cqw] w-[13cqw]" />
          <Pistas className="absolute right-[2.6cqw] bottom-[2.6cqw] w-[13cqw] rotate-180" />

          <div className="relative mt-[3cqw] w-[16cqw]">
            <Logo alto={40} className="w-full!" />
          </div>

          <p className="relative mt-[4.5cqw] text-[1.5cqw] font-medium tracking-[0.35em] text-acento uppercase">
            Diploma
          </p>
          <p className="relative mt-[2.5cqw] text-[1.8cqw] text-gris">Este diploma es para</p>
          <p className="relative mt-[1cqw] max-w-[80cqw] font-titulo text-[6cqw] leading-tight font-medium break-words">
            {nombre.trim() || " "}
          </p>
          <div aria-hidden="true" className="relative mt-[1.2cqw] h-px w-[40cqw] bg-linea" />
          <p className="relative mt-[2.2cqw] text-[2cqw]">
            por terminar el curso <strong className="font-semibold">{curso}</strong>
          </p>
          <p className="relative mt-[1cqw] max-w-[62cqw] text-[1.6cqw] text-gris">
            {kit
              ? `Ha montado el ${kit} pieza a pieza y lo ha hecho funcionar con su propio código. ${lecciones} lecciones, todas hechas.`
              : `${lecciones} lecciones, todas hechas.`}
          </p>

          <div className="relative mt-auto mb-[2cqw] flex w-[72cqw] items-end justify-between text-[1.4cqw] text-gris">
            <div className="text-left">
              <p className="text-tinta">{fecha}</p>
              <div aria-hidden="true" className="mt-[0.6cqw] h-px w-[20cqw] bg-tinta/40" />
              <p className="mt-[0.5cqw]">Fecha</p>
            </div>
            <div className="text-right">
              <p className="font-titulo text-[2cqw] text-tinta">El equipo de Valentia</p>
              <div aria-hidden="true" className="mt-[0.6cqw] ml-auto h-px w-[20cqw] bg-tinta/40" />
              <p className="mt-[0.5cqw]">valentiarobotics.com</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-gris print:hidden">
        Al pulsar «Descargar en PDF», elige <strong>Guardar como PDF</strong> en la ventana que se
        abre. También puedes imprimirlo directamente.
      </p>
    </>
  );
}

/** Adorno de esquina: unas pistas de circuito, como las de una placa */
function Pistas({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 80"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <g className="text-acento">
        <path d="M0 14 H40 L52 26 H78" />
        <path d="M0 28 H30 L44 42 H60 L68 50" />
        <path d="M14 0 V10 L24 20 V54" />
        <circle cx="82" cy="26" r="4" />
        <circle cx="71" cy="53" r="4" />
        <circle cx="24" cy="58" r="4" />
      </g>
    </svg>
  );
}
