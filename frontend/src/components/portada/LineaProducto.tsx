import { HojaKit } from "@/components/tienda/HojaKit";
import { Contenedor } from "@/components/ui/Contenedor";
import type { KitConPiezas } from "@/lib/catalogo";

/**
 * SEC_02 · LÍNEA DE PRODUCTO: una hoja técnica por kit (HojaKit, la misma que en /kits). Todas
 * iguales: se comparan de un vistazo.
 */
export function LineaProducto({ kits }: { kits: KitConPiezas[] }) {
  if (kits.length === 0) return null;
  return (
    <section
      id="linea-producto"
      aria-labelledby="titulo-linea"
      className="scroll-mt-nav border-t border-linea py-20 sm:py-28"
    >
      <Contenedor>
        <div className="aparecer flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="mono-etiqueta text-gris">
              <span className="text-acento">{"// "}</span>SEC_02 · Línea de producto
            </p>
            <h2 id="titulo-linea" className="titular-cartel mt-4 text-4xl font-semibold sm:text-6xl">
              {kits.length} plataformas. Un mismo sistema.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-gris">
            Mismo acoplamiento magnético, mismo entorno C++ y curso propio en cada kit. Los datos de
            cada hoja salen de su lista de materiales.
          </p>
        </div>

        <ul className="mt-12 grid border-t border-l border-linea md:grid-cols-3">
          {kits.map((kit) => (
            <li key={kit.slug} className="aparecer border-r border-b border-linea">
              <HojaKit kit={kit} />
            </li>
          ))}
        </ul>
      </Contenedor>
    </section>
  );
}
