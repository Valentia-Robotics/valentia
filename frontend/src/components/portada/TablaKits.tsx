"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilaKit {
  slug: string;
  nombre: string;
  eslogan: string;
  imagen: string;
  nivel: string;
  edadMinima: number;
  tiempoMontaje: string;
  precio: string;
  lecciones: number;
}

/** Color del chip de cada fila (se repiten si hay más kits) */
const CHIPS = ["bg-acento", "bg-senal", "bg-exito", "bg-error"];

/**
 * TABLA DE KITS DE LA PORTADA (estilo hoja de precios): una fila por kit, con su chip de color y
 * su dirección en letra de máquina. En ordenador, al pasar el ratón por una fila, la foto del kit
 * aparece y sigue al cursor. Toda la fila es un enlace a la ficha.
 */
export function TablaKits({ kits }: { kits: FilaKit[] }) {
  const tabla = useRef<HTMLDivElement>(null);
  const foto = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState<FilaKit | null>(null);

  // La foto sigue al ratón sin pasar por React (se mueve en cada fotograma, sin redibujar la tabla)
  const alMover = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !tabla.current || !foto.current) return;
    const caja = tabla.current.getBoundingClientRect();
    foto.current.style.translate = `${e.clientX - caja.left + 24}px ${e.clientY - caja.top - 90}px`;
  };

  return (
    <div
      ref={tabla}
      onPointerMove={alMover}
      onPointerLeave={() => setActivo(null)}
      className="relative rounded-recto bg-salvia px-4 py-2 sm:px-6"
    >
      {/* Cabecera (solo en pantallas anchas: en el móvil cada fila lleva sus etiquetas) */}
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,2.2fr)_1fr_0.8fr_1fr_1fr_2rem] gap-6 px-2 pt-4 pb-1 text-sm md:grid"
      >
        {["Kit", "Nivel", "Edad", "Montaje", "Precio"].map((t) => (
          <span key={t} className="linea-puntos pb-3">
            {t}
          </span>
        ))}
      </div>

      <ul>
        {kits.map((kit, i) => (
          <li key={kit.slug} className="border-b border-dotted border-tinta/25 last:border-b-0">
            <Link
              href={`/kits/${kit.slug}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActivo(kit)}
              className="group grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1 py-5 transition-[background-color,padding] duration-300 hover:bg-white/60 md:grid-cols-[minmax(0,2.2fr)_1fr_0.8fr_1fr_1fr_2rem] md:gap-6 md:px-2 md:hover:pl-4"
            >
              {/* Foto pequeña: solo en el móvil (en ordenador sale la que sigue al ratón) */}
              <Image
                src={kit.imagen}
                alt=""
                width={144}
                height={108}
                unoptimized
                className="row-span-3 h-auto w-18 md:hidden"
              />
              <span className="min-w-0">
                <span className="inline-flex items-center gap-2.5 rounded-recto bg-white py-1.5 pr-3 pl-2 font-medium">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-[3px]",
                      CHIPS[i % CHIPS.length],
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-white/80" />
                  </span>
                  {kit.nombre}
                </span>
                <span className="mt-1.5 block truncate font-mono text-xs text-tinta/60">
                  ↳ /kits/{kit.slug}
                </span>
              </span>
              <span className="text-sm md:text-base">
                <span className="text-tinta/60 md:hidden">Nivel: </span>
                {kit.nivel}
              </span>
              <span className="text-sm md:text-base">
                <span className="text-tinta/60 md:hidden">Edad: </span>+{kit.edadMinima}
              </span>
              <span className="hidden md:block">{kit.tiempoMontaje}</span>
              <span className="col-start-2 text-sm md:col-start-auto md:text-base">
                <span className="font-medium tabular-nums">{kit.precio}</span>
                <span className="block text-xs text-tinta/60">
                  Curso de {kit.lecciones} lecciones
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="hidden size-5 -translate-x-1 opacity-40 transition-[translate,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:block"
              />
            </Link>
          </li>
        ))}
      </ul>

      {/* La foto que sigue al ratón */}
      <div
        ref={foto}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 left-0 z-10 hidden w-56 transition-[opacity,scale] duration-300 md:block",
          activo ? "scale-100 opacity-100" : "scale-90 opacity-0",
        )}
      >
        {activo && (
          <div className="rounded-recto bg-white p-3 shadow-flotante">
            <Image
              src={activo.imagen}
              alt=""
              width={320}
              height={240}
              unoptimized
              className="h-auto w-full"
            />
            <p className="mt-2 font-serif text-sm leading-snug">{activo.eslogan}</p>
          </div>
        )}
      </div>
    </div>
  );
}
