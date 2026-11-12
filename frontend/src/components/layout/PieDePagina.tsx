import { EnlacesPie } from "@/components/layout/EnlacesPie";
import { Logo } from "@/components/marca/Logo";
import { Contenedor } from "@/components/ui/Contenedor";
import { columnasPie, enlacesLegales, marca } from "@/config/marca";
import { tienda } from "@/config/tienda";
import { BotonConfigurarCookies } from "./BotonConfigurarCookies";

/**
 * Pie de página (tienda industrial): carbón con rejilla de plano, columnas de enlaces con su
 * etiqueta en mono («// TIENDA») y una línea de datos al final (©, IVA, zona de envío).
 */
export function PieDePagina() {
  const anio = new Date().getFullYear();

  return (
    <footer className="rejilla-plano border-t border-linea bg-carbon text-sm text-tinta print:hidden">
      <Contenedor className="pt-16 pb-10">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo alto={16} fondo="oscuro" />
            <p className="mt-5 leading-relaxed text-gris">{marca.descripcion}</p>
          </div>

          {columnasPie.map((columna) => (
            <nav key={columna.titulo} aria-label={columna.titulo}>
              <h2 className="mono-etiqueta font-normal tracking-[0.08em] text-gris-claro">
                <span aria-hidden="true" className="text-acento">
                  {"// "}
                </span>
                {columna.titulo}
              </h2>
              <EnlacesPie enlaces={columna.enlaces} enlacesConSesion={columna.enlacesConSesion} />
            </nav>
          ))}
          <nav aria-label="Legal">
            <h2 className="mono-etiqueta font-normal tracking-[0.08em] text-gris-claro">
              <span aria-hidden="true" className="text-acento">
                {"// "}
              </span>
              Legal
            </h2>
            <EnlacesPie enlaces={enlacesLegales} />
          </nav>
        </div>

        <div className="mono-etiqueta mt-14 flex flex-col gap-2 border-t border-linea pt-6 text-gris-claro sm:flex-row sm:justify-between">
          <p>
            © {anio} {marca.nombre} Robotics
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <span>PVP con IVA incl.</span>
            <span>Envíos: {tienda.envio.nombreZona}</span>
            <BotonConfigurarCookies className="uppercase hover:text-tinta" />
          </p>
        </div>
      </Contenedor>
    </footer>
  );
}
