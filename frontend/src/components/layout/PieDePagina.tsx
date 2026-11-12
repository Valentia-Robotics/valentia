import { EnlacesPie } from "@/components/layout/EnlacesPie";
import { Logo } from "@/components/marca/Logo";
import { Contenedor } from "@/components/ui/Contenedor";
import { columnasPie, enlacesLegales, marca } from "@/config/marca";
import { tienda } from "@/config/tienda";
import { BotonConfigurarCookies } from "./BotonConfigurarCookies";

/**
 * Pie de página en negro, sobrio: logo, columnas de enlaces y © Valentia.
 */
export function PieDePagina() {
  const anio = new Date().getFullYear();

  return (
    <footer className="bg-tinta text-sm text-white print:hidden">
      <Contenedor className="pt-16 pb-10">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo alto={18} fondo="oscuro" />
            <p className="mt-5 leading-relaxed text-gris-claro">{marca.descripcion}</p>
          </div>

          {columnasPie.map((columna) => (
            <nav key={columna.titulo} aria-label={columna.titulo}>
              <h2 className="font-sans text-sm font-normal tracking-normal text-white/55">
                {columna.titulo}
              </h2>
              <EnlacesPie enlaces={columna.enlaces} enlacesConSesion={columna.enlacesConSesion} />
            </nav>
          ))}
          <nav aria-label="Legal">
            <h2 className="font-sans text-sm font-normal tracking-normal text-white/55">Legal</h2>
            <EnlacesPie enlaces={enlacesLegales} />
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/12 pt-6 text-xs text-gris-claro sm:flex-row sm:justify-between">
          <p>
            © {anio} {marca.nombre}. Todos los derechos reservados.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Precios con IVA incluido. Envíos a la {tienda.envio.nombreZona}.</span>
            <BotonConfigurarCookies className="text-gris-claro hover:text-white" />
          </p>
        </div>
      </Contenedor>
    </footer>
  );
}
