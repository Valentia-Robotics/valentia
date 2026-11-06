import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Contenedor } from "@/components/ui/Contenedor";

/**
 * Envoltorio de las páginas legales: título, fecha y el aviso de BORRADOR.
 * ⚠ BORRADOR — pendiente de revisión por un profesional. Quita el aviso (prop "borrador")
 * solo cuando un abogado haya revisado y aprobado el texto.
 */
export function PaginaLegal({
  titulo,
  actualizado,
  borrador = true,
  children,
}: {
  titulo: string;
  /** Fecha de la última versión, por ejemplo "17 de octubre de 2026" */
  actualizado: string;
  borrador?: boolean;
  children: ReactNode;
}) {
  return (
    <Contenedor className="max-w-3xl py-12 sm:py-16">
      {borrador && (
        <p
          role="note"
          className="mb-8 flex items-start gap-3 rounded-tarjeta border-2 border-aviso/50 bg-aviso/8 p-4 text-sm text-aviso-oscuro"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong className="font-semibold">
              BORRADOR — pendiente de revisión por un profesional.
            </strong>{" "}
            Este texto es provisional y no debe publicarse sin que lo revise un abogado.
          </span>
        </p>
      )}
      <h1 className="text-4xl font-medium sm:text-5xl">{titulo}</h1>
      <p className="mt-3 text-sm text-gris">Última actualización: {actualizado}</p>
      <div
        className={[
          "mt-10 leading-relaxed text-tinta/90",
          "[&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:text-tinta",
          "[&_h3]:mt-8 [&_h3]:font-sans [&_h3]:text-lg [&_h3]:font-semibold",
          "[&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
          "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
          "[&_a]:text-acento [&_a]:underline [&_a]:underline-offset-2",
          "[&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-linea [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pr-3 [&_th]:pb-2 [&_th]:text-left [&_th]:font-medium",
        ].join(" ")}
      >
        {children}
      </div>
    </Contenedor>
  );
}

/** Datos de la empresa en un bloque (salen de src/config/tienda.ts) */
export function DatosEmpresa({ datos }: { datos: [string, string][] }) {
  return (
    <ul className="list-none! pl-0!">
      {datos.map(([nombre, valor]) => (
        <li key={nombre}>
          <strong className="font-medium">{nombre}:</strong> {valor}
        </li>
      ))}
    </ul>
  );
}

/** Tabla que se puede deslizar de lado en el móvil (y enfocar con el teclado para hacerlo) */
export function TablaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={titulo}
      tabIndex={0}
      className="mt-4 overflow-x-auto rounded-control focus-visible:ring-2 focus-visible:ring-acento"
    >
      <table className="min-w-[32rem]">{children}</table>
    </div>
  );
}
