import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { PackageOpen } from "lucide-react";
import { TarjetaKit } from "@/components/tienda/TarjetaKit";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { obtenerKits } from "@/lib/catalogo";
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
    "Coche seguidor de líneas, brazo robótico y estación meteorológica con Arduino y ESP32. Cada kit trae todas las piezas y un curso en vídeo para montarlo sin saber programar.",
  ruta: "/kits",
});

/** Listado de todos los kits */
export default async function PaginaKits() {
  const kits = await obtenerKits();

  return (
    <Contenedor className="py-16 sm:py-24">
      {kits.length > 0 && <DatosEstructurados datos={datosListaKits(kits)} />}
      <DatosEstructurados
        datos={datosMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Kits", ruta: "/kits" },
        ])}
      />
      <header className="max-w-2xl">
        <p className="text-sm font-medium tracking-wide text-acento uppercase">Kits Valentia</p>
        <h1 className="mt-3 text-4xl font-medium sm:text-6xl">Elige tu primer robot.</h1>
        <p className="mt-4 text-lg text-gris">
          Cada kit trae todas las piezas, las instrucciones y un curso paso a paso. Solo tienes que
          abrir la caja y empezar.
        </p>
      </header>

      {kits.length === 0 ? (
        <EstadoVacio
          icono={PackageOpen}
          titulo="Los kits están en camino"
          texto="Estamos preparando las cajas. Mientras tanto, puedes montar tu propio robot pieza a pieza o ver los componentes."
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

      <aside className="mt-16 flex flex-col items-start justify-between gap-6 rounded-tarjeta bg-niebla p-8 sm:flex-row sm:items-center sm:p-10">
        <div>
          <h2 className="text-2xl font-medium">¿Tienes una idea propia?</h2>
          <p className="mt-2 text-gris">Monta tu robot pieza a pieza en el configurador.</p>
        </div>
        <Boton href="/configurador" tamano="lg">
          Crear mi robot
        </Boton>
      </aside>
    </Contenedor>
  );
}
