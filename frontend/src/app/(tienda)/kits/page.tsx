import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { PackageOpen } from "lucide-react";
import { HojaKit } from "@/components/tienda/HojaKit";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { MarcoCAD } from "@/components/ui/MarcoCAD";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { obtenerKitsConPiezas } from "@/lib/catalogo";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { datosListaKits, datosMigas } from "@/lib/datosEstructurados";

/**
 * Se genera al compilar y se vuelve a leer de la base de datos cada 5 minutos como mucho: así el catálogo
 * cargado después del build (npm run seed:prod en el Pre-Deploy de Render) aparece sin volver a desplegar.
 * Los cambios del panel se ven al momento (refrescarTienda).
 */
export const revalidate = 300;

export const metadata: Metadata = metadatosPagina({
  titulo: "Kits de robótica modular con ESP32 y Arduino",
  descripcion:
    "Coche robótico multifunción VR1, brazo robótico y estación meteorológica sobre ESP32 y Arduino: lista de materiales, consumo, GPIO y curso de firmware en C++ en cada kit.",
  ruta: "/kits",
});

/** Listado de todos los kits: una hoja técnica por kit (HojaKit) */
export default async function PaginaKits() {
  const kits = await obtenerKitsConPiezas();

  return (
    <>
      <CabeceraPagina
        etiqueta="SEC_02 · Línea de producto"
        titulo="Kits."
        entradilla="Cada hoja resume la lista de materiales del kit: placa, actuadores, sensores, GPIO en uso y corriente de pico frente a la que entrega su batería."
      />
      <Contenedor className="py-12 sm:py-16">
        {kits.length > 0 && <DatosEstructurados datos={datosListaKits(kits)} />}
        <DatosEstructurados
          datos={datosMigas([
            { nombre: "Inicio", ruta: "/" },
            { nombre: "Kits", ruta: "/kits" },
          ])}
        />

        {kits.length === 0 ? (
          <EstadoVacio
            icono={PackageOpen}
            titulo="Sin kits publicados"
            texto="La primera tirada está en preparación. Mientras, puedes revisar los componentes sueltos o diseñar un montaje en el configurador."
          >
            <Boton href="/componentes" variante="secundario">
              Ver componentes
            </Boton>
          </EstadoVacio>
        ) : (
          <ul className="grid border-t border-l border-linea sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => (
              <li key={kit.slug} className="border-r border-b border-linea">
                <HojaKit kit={kit} />
              </li>
            ))}
          </ul>
        )}

        <MarcoCAD
          etiqueta="Montaje propio"
          className="mt-16 flex flex-col items-start justify-between gap-6 p-6 pt-8 sm:flex-row sm:items-center sm:p-10"
        >
          <div>
            <h2 className="text-3xl font-semibold">¿Otra combinación de piezas?</h2>
            <p className="mt-2 max-w-xl text-[15px] text-gris">
              En el banco de pruebas eliges placa, actuadores y sensores; calcula GPIO, corriente y
              niveles lógicos con cada pieza que añades.
            </p>
          </div>
          <Boton href="/configurador" tamano="lg">
            Abrir configurador
          </Boton>
        </MarcoCAD>
      </Contenedor>
    </>
  );
}
