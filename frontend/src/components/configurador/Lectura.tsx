import { cn, formatearNumero } from "@/lib/utils";

/**
 * LECTURA DE BANCO DE PRUEBAS: un valor en mono («10 / 25 GPIO») con su barra de segmentos, como el
 * display de una fuente de laboratorio. Verde hasta el 80 %, ámbar hasta el 100 %, rojo si se pasa.
 */
export function Lectura({
  etiqueta,
  usados,
  disponibles,
  unidad,
  segmentos = 20,
  className,
}: {
  etiqueta: string;
  usados: number;
  disponibles: number;
  unidad: string;
  segmentos?: number;
  className?: string;
}) {
  const proporcion = disponibles > 0 ? usados / disponibles : usados > 0 ? Infinity : 0;
  const llenos = Math.min(segmentos, Math.ceil(Math.min(1, proporcion) * segmentos));
  const estado = proporcion > 1 ? "error" : proporcion >= 0.8 ? "aviso" : "ok";
  const color = { ok: "bg-led", aviso: "bg-aviso", error: "bg-error" }[estado];
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="mono-etiqueta text-gris">{etiqueta}</span>
        <span
          className={cn(
            "font-mono text-[13px] tabular-nums",
            estado === "error" ? "text-error" : estado === "aviso" ? "text-aviso" : "text-tinta",
          )}
        >
          {formatearNumero(usados)}
          <span className="text-gris"> / {disponibles > 0 ? formatearNumero(disponibles) : "—"}</span>{" "}
          <span className="text-gris">{unidad}</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={disponibles}
        aria-valuenow={usados}
        aria-valuetext={`${formatearNumero(usados)} de ${formatearNumero(disponibles)} ${unidad}`}
        className="mt-2 flex gap-[3px]"
      >
        {Array.from({ length: segmentos }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 transition-colors duration-100",
              i < llenos ? color : "bg-linea",
            )}
          />
        ))}
      </div>
    </div>
  );
}
