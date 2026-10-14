import { Search } from "lucide-react";

/**
 * Buscador de las listas del panel. Envía la búsqueda en la dirección (?q=…),
 * así se puede recargar la página o compartir el enlace con la búsqueda hecha.
 * "extra" son otros filtros que hay que conservar al buscar (por ejemplo, el estado).
 */
export function Buscador({
  valor,
  placeholder,
  etiqueta = "Buscar",
  extra = {},
}: {
  valor?: string;
  placeholder: string;
  etiqueta?: string;
  extra?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="flex w-full max-w-md gap-2">
      {Object.entries(extra).map(
        ([nombre, v]) => v && <input key={nombre} type="hidden" name={nombre} value={v} />,
      )}
      <label className="relative flex-1">
        <span className="sr-only">{etiqueta}</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris"
        />
        <input
          type="search"
          name="q"
          defaultValue={valor}
          placeholder={placeholder}
          className="h-9 w-full rounded-md bg-white pr-3 pl-9 text-sm ring-1 ring-linea outline-none placeholder:text-gris-claro focus:ring-2 focus:ring-acento"
        />
      </label>
      <button
        type="submit"
        className="h-9 rounded-md bg-tinta px-3.5 text-sm font-medium text-white hover:bg-grafito"
      >
        Buscar
      </button>
    </form>
  );
}
