import type { Metadata } from "next";
import { TarjetaKit } from "@/components/tienda/TarjetaKit";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { obtenerKits } from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Kits",
  description: "Kits de robótica de Valentia con curso incluido: elige tu primer robot.",
};

/** Listado de todos los kits */
export default async function PaginaKits() {
  const kits = await obtenerKits();

  return (
    <Contenedor className="py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-sm font-medium tracking-wide text-acento uppercase">Kits Valentia</p>
        <h1 className="mt-3 text-4xl font-medium sm:text-6xl">Elige tu primer robot.</h1>
        <p className="mt-4 text-lg text-gris">
          Cada kit trae todas las piezas, las instrucciones y un curso paso a paso. Solo tienes que
          abrir la caja y empezar.
        </p>
      </header>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {kits.map((kit) => (
          <TarjetaKit key={kit.id} kit={kit} />
        ))}
      </div>

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
