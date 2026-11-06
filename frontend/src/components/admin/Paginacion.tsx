import Link from "next/link";

/** Enlaces "Anterior / Siguiente" de las listas largas. Conserva los demás filtros de la dirección. */
export function Paginacion({
  pagina,
  totalPaginas,
  ruta,
  filtros = {},
}: {
  pagina: number;
  totalPaginas: number;
  ruta: string;
  filtros?: Record<string, string | undefined>;
}) {
  if (totalPaginas <= 1) return null;
  const enlace = (p: number) => {
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) if (valor) params.set(clave, valor);
    if (p > 1) params.set("pagina", String(p));
    const texto = params.toString();
    return texto ? `${ruta}?${texto}` : ruta;
  };
  const clase = "rounded-md px-3 py-1.5 ring-1 ring-linea bg-white hover:ring-tinta/40";

  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-gris">
        Página {pagina} de {totalPaginas}
      </span>
      <span className="flex gap-2">
        {pagina > 1 && (
          <Link href={enlace(pagina - 1)} className={clase}>
            Anterior
          </Link>
        )}
        {pagina < totalPaginas && (
          <Link href={enlace(pagina + 1)} className={clase}>
            Siguiente
          </Link>
        )}
      </span>
    </nav>
  );
}

/** Lee el número de página de la dirección (?pagina=2). Siempre devuelve un número ≥ 1. */
export function leerPagina(valor: unknown): number {
  const numero = Number(typeof valor === "string" ? valor : 1);
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}
