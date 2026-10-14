import { cn } from "@/lib/utils";

/** Barra de "lecciones completadas" de un curso */
export function BarraProgreso({
  hechas,
  total,
  oscuro = false,
}: {
  hechas: number;
  total: number;
  oscuro?: boolean;
}) {
  const porcentaje = total > 0 ? Math.round((hechas / total) * 100) : 0;
  return (
    <div>
      <div className={cn("flex justify-between text-xs", oscuro ? "text-gris-claro" : "text-gris")}>
        <span>
          {hechas} de {total} lecciones
        </span>
        <span className="tabular-nums">{porcentaje} %</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progreso del curso"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className={cn(
          "mt-1.5 h-2 overflow-hidden rounded-full",
          oscuro ? "bg-white/15" : "bg-linea/70",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            porcentaje === 100 ? "bg-exito" : "bg-acento",
          )}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
