import { cn } from "@/lib/utils";

export type EstadoLed = "ok" | "aviso" | "error" | "acento" | "apagado";

const COLOR: Record<EstadoLed, string> = {
  ok: "text-led",
  aviso: "text-aviso",
  error: "text-error",
  acento: "text-acento",
  apagado: "",
};

/**
 * Indicador LED de estado (tienda industrial): verde = en marcha / en stock, ámbar = preventa o
 * aviso, rojo = error. Con texto al lado si hace falta («EN STOCK», «PREVENTA»…), en mono.
 */
export function Led({
  estado = "ok",
  texto,
  parpadeo = false,
  className,
}: {
  estado?: EstadoLed;
  texto?: string;
  parpadeo?: boolean;
  className?: string;
}) {
  const punto = (
    <span
      aria-hidden="true"
      className={cn(
        "led",
        COLOR[estado],
        estado === "apagado" && "led-apagado",
        parpadeo && "led-parpadeo",
      )}
    />
  );
  if (!texto) return <span className={cn("inline-flex", className)}>{punto}</span>;
  return (
    <span className={cn("mono-etiqueta inline-flex items-center gap-2 text-tinta", className)}>
      {punto}
      {texto}
    </span>
  );
}
