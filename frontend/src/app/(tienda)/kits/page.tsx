import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { PackageOpen } from "lucide-react";
import { TarjetaKit } from "@/components/tienda/TarjetaKit";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { obtenerKits } from "@/lib/catalogo";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { datosListaKits, datosMigas } from "@/lib/datosEstructurados";

/**
 * Se genera al compilar y se vuelve a leer de la base de datos cada 5 minutos como mucho: así el catálogo
 * cargado después del build (npm run seed:prod en el Pre-Deploy de Render) aparece sin volver a desplegar.
 * Los cambios del panel se ven al momento (refrescarTienda).
 */
export const revalidate = 300;

export const metadata: Metadata = metadatosPagina({
  titulo: "Kits de robótica para montar con curso",
  descripcion:
    "Coche robótico multifunción VR1, brazo robótico y estación meteorológica con Arduino y ESP32. Todas las piezas y curso en vídeo, sin saber programar.",
  ruta: "/kits",
});

/** Listado de todos los kits */
export default async function PaginaKits() {
  const kits = await obtenerKits();

  return (
    <>
      <CabeceraPagina
        etiqueta="Kits Valentia"
        titulo="Elige tu primer robot."
        entradilla="En cada caja van todas las piezas, el cable USB y una tarjeta para abrir el curso en vídeo. No tienes que comprar nada aparte."
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
            titulo="Los kits están en camino"
            texto="Aún estamos preparando las cajas. Mientras, puedes elegir piezas en el configurador o mirar los componentes."
          >
            <Boton href="/componentes" variante="secundario">
              Ver componentes
            </Boton>
          </EstadoVacio>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => (
              <TarjetaKit key={kit.id} kit={kit} />
            ))}
          </div>
        )}

        <aside className="mt-16 flex flex-col items-start justify-between gap-6 rounded-tarjeta border border-dashed border-tinta/30 bg-salvia p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-3xl font-medium">¿Tienes una idea propia?</h2>
            <p className="mt-2 text-tinta/75">
              En el configurador eliges las piezas una a una y te avisamos si algo no encaja.
            </p>
          </div>
          <Boton href="/configurador" tamano="lg">
            Crear mi robot
          </Boton>
        </aside>
      </Contenedor>
    </>
  );
}
