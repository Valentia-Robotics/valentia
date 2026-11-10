import Link from "next/link";
import { porcentaje } from "@/lib/admin/formato";

/** Lista de cifras con una barra de fondo proporcional ("Google ······ 25 · 40 %") */
export function ListaConBarras({
  filas,
  vacia,
  formato = String,
}: {
  filas: { nombre: string; ruta?: string; cantidad: number }[];
  vacia: string;
  /** Cómo se escribe cada cifra (por defecto, tal cual; en finanzas, en euros) */
  formato?: (cantidad: number) => string;
}) {
  if (filas.length === 0) return <p className="px-5 py-6 text-center text-sm text-gris">{vacia}</p>;
  const maximo = Math.max(...filas.map((f) => f.cantidad));
  const total = filas.reduce((suma, f) => suma + f.cantidad, 0);

  return (
    <ul className="space-y-1 p-3 text-sm sm:p-4">
      {filas.map((f) => (
        <li key={f.ruta ?? f.nombre} className="relative overflow-hidden rounded-md">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-niebla"
            style={{ width: `${(f.cantidad / maximo) * 100}%` }}
          />
          <div className="relative flex items-center justify-between gap-3 px-3 py-2">
            {f.ruta ? (
              <Link
                href={f.ruta}
                target="_blank"
                className="min-w-0 truncate hover:underline"
                title={f.ruta}
              >
                {f.nombre}
              </Link>
            ) : (
              <span className="min-w-0 truncate">{f.nombre}</span>
            )}
            <span className="shrink-0 tabular-nums">
              {formato(f.cantidad)}
              <span className="ml-2 inline-block w-10 text-right text-xs text-gris">
                {porcentaje(f.cantidad, total)}
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
