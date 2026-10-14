import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

interface Props {
  titulo: string;
  descripcion?: ReactNode;
  /** Enlace para volver a la lista ("‹ Componentes") */
  volver?: { href: string; etiqueta: string };
  /** Botones a la derecha (por ejemplo, "Nuevo componente") */
  acciones?: ReactNode;
}

/** Título de cada página del panel, con su descripción y sus botones */
export function Cabecera({ titulo, descripcion, volver, acciones }: Props) {
  return (
    <header className="mb-6 print:hidden">
      {volver && (
        <Link
          href={volver.href}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gris hover:text-tinta"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {volver.etiqueta}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium sm:text-3xl">{titulo}</h1>
          {descripcion && <p className="mt-1 text-sm text-gris">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </div>
    </header>
  );
}
