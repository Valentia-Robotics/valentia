/** Gráfico de barras de las visitas de cada día (sin librerías: solo HTML y CSS) */

const formatoCorto = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
/** "2026-10-27" → "27 oct" */
const diaCorto = (dia: string) => formatoCorto.format(new Date(`${dia}T00:00:00Z`));

export function GraficoVisitas({
  diario,
}: {
  diario: { dia: string; paginas: number; personas: number }[];
}) {
  const maximo = Math.max(1, ...diario.map((d) => d.paginas));
  const mitad = diario[Math.floor((diario.length - 1) / 2)];

  return (
    <figure>
      <div
        className="flex h-44 items-end gap-px sm:gap-0.5"
        role="img"
        aria-label={`Visitas de cada día, del ${diaCorto(diario[0].dia)} al ${diaCorto(diario[diario.length - 1].dia)}`}
      >
        {diario.map((d) => (
          // Cada barra: el alto total son las páginas vistas; la parte oscura, las personas
          <div
            key={d.dia}
            title={`${diaCorto(d.dia)}: ${d.personas} personas, ${d.paginas} páginas vistas`}
            className="relative flex h-full min-w-0 flex-1 items-end"
          >
            <div
              className="w-full rounded-t-sm bg-acento/20"
              style={{ height: `${(d.paginas / maximo) * 100}%` }}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-sm bg-acento"
                style={{ height: `${(d.personas / maximo) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-gris tabular-nums">
        <span>{diaCorto(diario[0].dia)}</span>
        {diario.length > 2 && <span>{diaCorto(mitad.dia)}</span>}
        <span>Hoy</span>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gris">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-acento" /> Personas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-acento/20" /> Páginas vistas
        </span>
        <span>Pasa el ratón por encima de una barra para ver las cifras del día.</span>
      </figcaption>
    </figure>
  );
}
