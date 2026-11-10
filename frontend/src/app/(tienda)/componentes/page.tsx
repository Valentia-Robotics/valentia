import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { Cpu, SlidersHorizontal } from "lucide-react";
import { TarjetaComponente } from "@/components/tienda/TarjetaComponente";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { categorias } from "@/config/categorias";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { obtenerComponentes } from "@/lib/catalogo";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { datosMigas } from "@/lib/datosEstructurados";

/**
 * Se genera al compilar y se vuelve a leer de la base de datos cada 5 minutos como mucho: así el catálogo
 * cargado después del build (npm run seed:prod en el Pre-Deploy de Render) aparece sin volver a desplegar.
 * Los cambios del panel se ven al momento (refrescarTienda).
 */
export const revalidate = 300;

export const metadata: Metadata = metadatosPagina({
  titulo: "Componentes de robótica: Arduino, sensores y servos",
  descripcion:
    "Placas Arduino UNO y ESP32, motores, servos, sensores, pantallas y baterías sueltos para ampliar tu robot o crear uno nuevo. Precios con IVA.",
  ruta: "/componentes",
});

/** COMPONENTES SUELTOS, agrupados por categoría */
export default async function PaginaComponentes() {
  const componentes = await obtenerComponentes();
  // Solo las categorías que tienen algún componente
  const grupos = categorias
    .map((categoria) => ({
      ...categoria,
      piezas: componentes.filter((c) => c.categoria === categoria.id),
    }))
    .filter((grupo) => grupo.piezas.length > 0);

  return (
    <>
      <CabeceraPagina
        etiqueta="Componentes"
        titulo="Componentes sueltos."
        entradilla="Para ampliar el kit que ya tienes o empezar otro proyecto. Si no tienes claro si una pieza va con las demás, pruébala en el configurador."
      >
        <Boton href="/configurador" variante="primario" tamano="lg">
          <SlidersHorizontal aria-hidden="true" className="size-5" strokeWidth={1.8} />
          Montar en el configurador
        </Boton>
      </CabeceraPagina>
      <Contenedor className="py-12 sm:py-16">
        <DatosEstructurados
          datos={datosMigas([
            { nombre: "Inicio", ruta: "/" },
            { nombre: "Componentes", ruta: "/componentes" },
          ])}
        />

        {/* Atajos a cada categoría */}
        <nav aria-label="Categorías" className="mt-10">
          <ul className="flex flex-wrap gap-2">
            {grupos.map(({ id, nombre, icono: Icono }) => (
              <li key={id}>
                <a
                  href={`#${id.toLowerCase()}`}
                  className="inline-flex items-center gap-2 rounded-boton bg-niebla px-4 py-2 font-mono text-xs transition-colors hover:bg-acento hover:text-white"
                >
                  <Icono aria-hidden="true" className="size-4 text-acento" strokeWidth={1.6} />
                  {nombre}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {grupos.length === 0 && (
          <EstadoVacio
            icono={Cpu}
            titulo="Aún no hay piezas a la venta"
            texto="Las estamos preparando. Mientras, puedes ver los kits."
          >
            <Boton href="/kits" variante="secundario">
              Ver los kits
            </Boton>
          </EstadoVacio>
        )}

        {grupos.map(({ id, nombre, descripcion, piezas }) => (
          <section
            key={id}
            id={id.toLowerCase()}
            aria-labelledby={`titulo-${id}`}
            className="mt-16 scroll-mt-[calc(var(--spacing-nav)+1.5rem)]"
          >
            <h2 id={`titulo-${id}`} className="text-4xl font-medium">
              {nombre}
            </h2>
            <p className="mt-1 text-gris">{descripcion}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {piezas.map((componente) => (
                <TarjetaComponente key={componente.slug} componente={componente} />
              ))}
            </div>
          </section>
        ))}
      </Contenedor>
    </>
  );
}
