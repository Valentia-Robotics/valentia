import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { Cpu } from "lucide-react";
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
        etiqueta="SEC_03 · Componentes"
        titulo="Componentes."
        entradilla="Las mismas referencias que van en los kits, sueltas: placas, actuadores, sensores y alimentación. Tensión, consumo y GPIO de cada una a la vista; la compatibilidad se comprueba en el configurador."
      >
        <Boton href="/configurador" variante="primario" tamano="lg">
          Abrir configurador
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
          <ul className="flex flex-wrap border-t border-l border-linea">
            {grupos.map(({ id, nombre, piezas }, i) => (
              <li key={id} className="border-r border-b border-linea">
                <a
                  href={`#${id.toLowerCase()}`}
                  className="mono-etiqueta flex items-center gap-2 px-4 py-2.5 text-gris transition-colors duration-100 hover:bg-panel hover:text-tinta"
                >
                  <span className="text-gris-claro">{String(i + 1).padStart(2, "0")}</span>
                  {nombre}
                  <span className="text-gris-claro">[{piezas.length}]</span>
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

        {grupos.map(({ id, nombre, descripcion, piezas }, i) => (
          <section
            key={id}
            id={id.toLowerCase()}
            aria-labelledby={`titulo-${id}`}
            className="mt-16 scroll-mt-[calc(var(--spacing-nav)+1.5rem)]"
          >
            <p className="mono-etiqueta text-gris">
              <span className="text-acento">{"// "}</span>CAT_{String(i + 1).padStart(2, "0")} ·{" "}
              {piezas.length} {piezas.length === 1 ? "referencia" : "referencias"}
            </p>
            <h2 id={`titulo-${id}`} className="mt-2 text-3xl font-semibold sm:text-4xl">
              {nombre}
            </h2>
            <p className="mt-1 text-[15px] text-gris">{descripcion}</p>
            <ul className="mt-6 grid border-t border-l border-linea sm:grid-cols-2 lg:grid-cols-3">
              {piezas.map((componente) => (
                <li key={componente.slug} className="border-r border-b border-linea">
                  <TarjetaComponente componente={componente} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Contenedor>
    </>
  );
}
