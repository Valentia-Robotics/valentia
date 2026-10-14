import { Logo } from "@/components/marca/Logo";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";

/**
 * Página de inicio (versión provisional de la fase 1).
 * En la fase 2 la sustituiremos por la portada completa con el kit estrella.
 */
export default function Inicio() {
  return (
    <>
      {/* Bloque claro */}
      <section className="bg-white">
        <Contenedor className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
          <p className="text-sm font-medium tracking-wide text-acento uppercase">
            Kits de robótica con cursos
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-medium sm:text-7xl">
            Atrévete a construir tu propio robot.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-gris sm:text-xl">
            No hace falta saber de electrónica. Cada kit trae todo lo que necesitas y un curso que
            te acompaña paso a paso.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Boton href="/kits" variante="acento" tamano="lg">
              Ver kits
            </Boton>
            <Boton href="/configurador" variante="secundario" tamano="lg">
              Crea tu robot
            </Boton>
          </div>
        </Contenedor>
      </section>

      {/* Bloque oscuro: el logo en su versión blanca */}
      <section className="bg-tinta text-white">
        <Contenedor className="flex flex-col items-center py-24 text-center">
          <Logo fondo="oscuro" alto={28} className="opacity-95" />
          <p className="mt-8 max-w-lg text-lg text-gris-claro">
            Aprender robótica empieza con una pieza. Luego otra. Y de repente, tu robot se mueve.
          </p>
          <Boton href="/diseno" variante="enlace-claro" className="mt-6">
            Ver el sistema de diseño ›
          </Boton>
        </Contenedor>
      </section>
    </>
  );
}
