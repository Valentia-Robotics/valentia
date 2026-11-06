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
    <Contenedor className="py-16 sm:py-24">
      <DatosEstructurados
        datos={datosMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Componentes", ruta: "/componentes" },
        ])}
      />
      <header className="max-w-2xl">
        <p className="text-sm font-medium tracking-wide text-acento uppercase">Componentes</p>
        <h1 className="mt-3 text-4xl font-medium sm:text-6xl">Las piezas de tus ideas.</h1>
        <p className="mt-4 text-lg text-gris">
          Amplía tu kit o empieza un proyecto nuevo. Si no sabes si algo encaja, móntalo en el
          configurador y te lo diremos.
        </p>
        <Boton href="/configurador" variante="secundario" tamano="lg" className="mt-6">
          <SlidersHorizontal aria-hidden="true" className="size-5" strokeWidth={1.8} />
          Montar en el configurador
        </Boton>
      </header>

      {/* Atajos a cada categoría */}
      <nav aria-label="Categorías" className="mt-10">
        <ul className="flex flex-wrap gap-2">
          {grupos.map(({ id, nombre, icono: Icono }) => (
            <li key={id}>
              <a
                href={`#${id.toLowerCase()}`}
                className="inline-flex items-center gap-2 rounded-boton bg-niebla px-4 py-2 text-sm transition-colors hover:bg-linea/60"
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
          titulo="Pronto tendrás piezas aquí"
          texto="Todavía no hay componentes a la venta. Vuelve en unos días o echa un vistazo a los kits."
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
          <h2 id={`titulo-${id}`} className="text-3xl font-medium">
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
  );
}
