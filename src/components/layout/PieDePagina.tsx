import { EnlacesPie } from "@/components/layout/EnlacesPie";
import { Logo } from "@/components/marca/Logo";
import { Contenedor } from "@/components/ui/Contenedor";
import { columnasPie, marca } from "@/config/marca";

/** Pie de página con el logo, columnas de enlaces y © Valentia. */
export function PieDePagina() {
  const anio = new Date().getFullYear();

  return (
    <footer className="border-t border-linea bg-niebla text-sm print:hidden">
      <Contenedor className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
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
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-linea pt-6 text-xs text-gris sm:flex-row sm:justify-between">
          <p>
            © {anio} {marca.nombre}. Todos los derechos reservados.
          </p>
          <p>Precios con IVA incluido. Pagos simulados: versión de pruebas.</p>
        </div>
      </Contenedor>
    </footer>
  );
}
