import { EnlacesPie } from "@/components/layout/EnlacesPie";
import { Logo } from "@/components/marca/Logo";
import { Contenedor } from "@/components/ui/Contenedor";
import { columnasPie, enlacesLegales, marca } from "@/config/marca";
import { tienda } from "@/config/tienda";
import { BotonConfigurarCookies } from "./BotonConfigurarCookies";

/** Pie de página con el logo, columnas de enlaces y © Valentia. */
export function PieDePagina() {
  const anio = new Date().getFullYear();

  return (
    // Sin línea de corte: el fondo pasa poco a poco del blanco de la página a la niebla del pie
    <footer className="bg-linear-to-b from-white to-niebla to-[9rem] text-sm print:hidden">
      <Contenedor className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo alto={18} />
            <p className="mt-5 leading-relaxed text-gris">{marca.descripcion}</p>
          </div>

          {columnasPie.map((columna) => (
            <nav key={columna.titulo} aria-label={columna.titulo}>
              <h2 className="font-sans text-xs font-semibold tracking-wide text-tinta uppercase">
                {columna.titulo}
              </h2>
              <EnlacesPie enlaces={columna.enlaces} enlacesConSesion={columna.enlacesConSesion} />
            </nav>
          ))}
          <nav aria-label="Legal">
            <h2 className="font-sans text-xs font-semibold tracking-wide text-tinta uppercase">
              Legal
            </h2>
            <EnlacesPie enlaces={enlacesLegales} />
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-linea pt-6 text-xs text-gris sm:flex-row sm:justify-between">
          <p>
            © {anio} {marca.nombre}. Todos los derechos reservados.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Precios con IVA incluido. Envíos a la {tienda.envio.nombreZona}.</span>
            <BotonConfigurarCookies className="text-gris hover:text-tinta" />
          </p>
        </div>
      </Contenedor>
    </footer>
  );
}
