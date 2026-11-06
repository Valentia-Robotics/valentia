import { Contenedor } from "./Contenedor";

/**
 * Estado de carga: bloques grises que "respiran" con la forma aproximada de la página.
 * Lo usan los archivos loading.tsx mientras el servidor prepara la página.
 */
export function Cargando({
  texto = "Cargando…",
  bloques = 3,
}: {
  texto?: string;
  bloques?: number;
}) {
  return (
    <Contenedor className="py-12 sm:py-16">
      <div role="status" aria-live="polite" className="animate-pulse motion-reduce:animate-none">
        <span className="sr-only">{texto}</span>
        <div className="h-4 w-32 rounded-full bg-niebla" />
        <div className="mt-4 h-12 w-2/3 max-w-md rounded-control bg-niebla" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: bloques }, (_, i) => (
            <div key={i} className="h-40 rounded-tarjeta bg-niebla" />
          ))}
        </div>
      </div>
    </Contenedor>
  );
}
