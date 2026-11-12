import Image from "next/image";
import Link from "next/link";
import { FotoKitViaje } from "@/components/tienda/FotoKitViaje";
import { Led } from "@/components/ui/Led";
import { Cruces } from "@/components/ui/MarcoCAD";
import { textoTienda } from "@/config/stock";
import type { KitConPiezas } from "@/lib/catalogo";
import { resumenTecnico } from "@/lib/resumenTecnico";
import { formatearNumero, precioDeKit } from "@/lib/utils";

/**
 * HOJA TÉCNICA DE UN KIT (portada y /kits): referencia, estado de stock con LED, foto sobre rejilla,
 * matriz de datos calculada de sus piezas reales (motor de compatibilidad) y precio en mono.
 * Toda la hoja enlaza a la ficha y la foto «viaja» hasta ella. Va dentro de un <li> con fondo.
 */
export function HojaKit({ kit }: { kit: KitConPiezas }) {
  const r = resumenTecnico(kit.piezas);
  const gratis = kit.precioCentimos === 0;
  const estado = textoTienda(kit.stock, kit.enReposicion);
  const lecciones = kit.curso.lecciones.length;
  const filas: [string, string][] =
    kit.piezas.length === 0
      ? [
          ["Contenido", "Curso digital"],
          ["Lecciones", String(lecciones)],
        ]
      : [
          ["MCU", r.mcu ?? "—"],
          ["Lógica", r.logica ? `${formatearNumero(r.logica)} V` : "—"],
          ["Actuadores", r.actuadores ?? "—"],
          ["Sensores", r.sensores ? `${r.sensores} canales` : "—"],
          ["GPIO", r.gpio ? `${r.gpio.usados} / ${r.gpio.disponibles}` : "—"],
          [
            "Consumo",
            r.corriente
              ? `${formatearNumero(r.corriente.usados)} / ${formatearNumero(r.corriente.disponibles)} mA`
              : r.consumoMa
                ? `${formatearNumero(r.consumoMa)} mA · USB`
                : "—",
          ],
        ];
  return (
    <Link
      href={`/kits/${kit.slug}`}
      className="group flex h-full flex-col p-5 transition-colors duration-150 hover:bg-panel sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="mono-etiqueta truncate text-gris">REF · {kit.slug.toUpperCase()}</span>
        {!gratis && (
          <Led
            estado={estado === "En stock" ? "ok" : estado === "En reposición" ? "aviso" : "apagado"}
            texto={estado}
            className="shrink-0 text-[10px] text-gris"
          />
        )}
      </div>
      <div className="rejilla-plano-fina relative mt-4 flex aspect-[4/3] items-center justify-center border border-linea bg-panel">
        <Cruces />
        <FotoKitViaje slug={kit.slug}>
          <Image
            src={kit.imagen}
            alt={`${kit.nombre}, montado`}
            width={800}
            height={600}
            unoptimized
            className="h-auto w-full"
          />
        </FotoKitViaje>
        <span className="mono-etiqueta absolute bottom-2 left-2.5 text-[10px] text-gris-claro">
          {kit.piezas.length > 0 &&
            `${kit.piezas.reduce((n, p) => n + p.cantidad, 0)} piezas · `}
          {lecciones} {lecciones === 1 ? "lección" : "lecciones"}
        </span>
      </div>
      <h3 className="mt-5 text-xl leading-snug font-semibold text-pretty">{kit.nombre}</h3>
      <dl className="mt-4 grid grid-cols-2 border-t border-l border-linea font-mono text-[12px]">
        {filas.map(([nombre, valor]) => (
          <div key={nombre} className="border-r border-b border-linea px-2.5 py-2">
            <dt className="mono-etiqueta text-[10px] text-gris">{nombre}</dt>
            <dd className="mt-0.5 truncate text-tinta">{valor}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto flex items-center justify-between gap-3 pt-6">
        <span className="font-mono text-lg text-tinta tabular-nums">
          {precioDeKit(kit.precioCentimos)}
        </span>
        <span className="mono-etiqueta border border-borde-fuerte px-3 py-2 text-tinta transition-colors duration-100 group-hover:border-acento group-hover:bg-acento group-hover:text-carbon">
          Ficha técnica →
        </span>
      </div>
    </Link>
  );
}
