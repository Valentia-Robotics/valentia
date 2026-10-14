/** Barra de progreso con su porcentaje. Si el valor es null (no hay datos), muestra "Sin alumnos". */
export function BarraPorcentaje({
  valor,
  vacio = "Sin alumnos",
}: {
  valor: number | null;
  vacio?: string;
}) {
  if (valor === null) return <span className="text-xs text-gris">{vacio}</span>;
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso"
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10"
      >
        <div className="h-full rounded-full bg-acento" style={{ width: `${valor}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums">{valor} %</span>
    </div>
  );
}
