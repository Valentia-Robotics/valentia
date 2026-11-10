/**
 * GRÁFICOS DE FINANZAS (/admin/finanzas). Sin librerías: HTML, CSS y un poco de SVG.
 * Pasa el ratón (o toca) cada barra o punto para ver sus cifras.
 * Colores: ingresos en azul (acento), gastos en naranja (aviso); se distinguen también
 * con daltonismo. El beneficio va hacia arriba (verde) o hacia abajo (rojo) desde el cero.
 */
import { mesCorto, mesLargo } from "@/config/finanzas";
import type { Mes } from "@/lib/finanzas/resumen";
import { cn, formatearPrecio } from "@/lib/utils";

/** Con muchos meses, solo se escribe el nombre de algunos (para que no se monten) */
function EtiquetasMeses({ meses }: { meses: Mes[] }) {
  const paso = Math.ceil(meses.length / 12);
  return (
    <div className="mt-2 flex gap-1 text-[11px] leading-tight text-gris tabular-nums sm:gap-2">
      {meses.map((m, i) => {
        const visible = i % paso === 0;
        // El año, debajo del mes, solo en el primero y en cada enero
        const conAnio = visible && (i === 0 || m.mes.endsWith("-01"));
        return (
          <span key={m.mes} className="min-w-0 flex-1 truncate text-center">
            {visible ? mesCorto(m.mes) : ""}
            {conAnio && <span className="block text-[10px]">{m.mes.slice(0, 4)}</span>}
          </span>
        );
      })}
    </div>
  );
}

function Leyenda({ elementos }: { elementos: { clase: string; texto: string }[] }) {
  return (
    <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gris">
      {elementos.map((e) => (
        <span key={e.texto} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-2.5 rounded-sm", e.clase)} /> {e.texto}
        </span>
      ))}
    </figcaption>
  );
}

/** Escala del eje: un número redondo por encima del máximo (1.000 €, 2.500 €…) */
function techo(centimos: number): number {
  if (centimos <= 0) return 10000;
  const magnitud = 10 ** Math.floor(Math.log10(centimos));
  const pasos = [1, 2, 2.5, 5, 10];
  return pasos.map((p) => p * magnitud).find((v) => v >= centimos) ?? 10 * magnitud;
}

const eurosRedondos = (centimos: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    notation: Math.abs(centimos) >= 10_000_000 ? "compact" : "standard",
  }).format(centimos / 100);

/** Rejilla de fondo con 0, mitad y máximo */
function Rejilla({ maximo, minimo = 0 }: { maximo: number; minimo?: number }) {
  const lineas = minimo < 0 ? [maximo, 0, minimo] : [maximo, maximo / 2, 0];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {lineas.map((v) => (
        <div
          key={v}
          className={cn(
            "absolute inset-x-0 border-t",
            v === 0 ? "border-tinta/25" : "border-dashed border-linea/70",
          )}
          style={{ top: `${((maximo - v) / (maximo - minimo)) * 100}%` }}
        >
          <span className="absolute -top-2 left-0 bg-white pr-1 text-[10px] leading-none text-gris tabular-nums">
            {eurosRedondos(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Ingresos y gastos de cada mes, barra con barra */
export function GraficoIngresosGastos({ meses }: { meses: Mes[] }) {
  const maximo = techo(Math.max(...meses.map((m) => Math.max(m.ingresos, m.gastos))));
  return (
    <figure>
      <div className="relative h-56 pl-12">
        <Rejilla maximo={maximo} />
        <div
          className="relative flex h-full items-end gap-1 sm:gap-2"
          role="img"
          aria-label="Ingresos y gastos de cada mes. Las cifras exactas están en la tabla «Mes a mes»."
        >
          {meses.map((m) => (
            <div
              key={m.mes}
              title={`${mesLargo(m.mes)}\nIngresos: ${formatearPrecio(m.ingresos)}\nGastos: ${formatearPrecio(m.gastos)}\nBeneficio: ${formatearPrecio(m.beneficio)}`}
              className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-sm hover:bg-niebla/70"
            >
              <div
                className="w-full max-w-5 rounded-t bg-acento"
                style={{ height: `${(m.ingresos / maximo) * 100}%` }}
              />
              <div
                className="w-full max-w-5 rounded-t bg-aviso"
                style={{ height: `${(m.gastos / maximo) * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="pl-12">
        <EtiquetasMeses meses={meses} />
      </div>
      <Leyenda
        elementos={[
          { clase: "bg-acento", texto: "Ingresos" },
          { clase: "bg-aviso", texto: "Gastos" },
        ]}
      />
    </figure>
  );
}

/** Beneficio de cada mes: hacia arriba si se gana, hacia abajo si se pierde */
export function GraficoBeneficio({ meses }: { meses: Mes[] }) {
  const arriba = techo(Math.max(0, ...meses.map((m) => m.beneficio)));
  const perdidaMaxima = Math.max(0, ...meses.map((m) => -m.beneficio));
  const abajo = perdidaMaxima > 0 ? -techo(perdidaMaxima) : 0;
  const alto = arriba - abajo;
  const cero = (arriba / alto) * 100;

  return (
    <figure>
      <div className="relative h-48 pl-12">
        <Rejilla maximo={arriba} minimo={abajo} />
        <div
          className="relative flex h-full gap-1 sm:gap-2"
          role="img"
          aria-label="Beneficio de cada mes. Las cifras exactas están en la tabla «Mes a mes»."
        >
          {meses.map((m) => {
            const altura = (Math.abs(m.beneficio) / alto) * 100;
            return (
              <div
                key={m.mes}
                title={`${mesLargo(m.mes)}: ${m.beneficio >= 0 ? "beneficio" : "pérdida"} de ${formatearPrecio(Math.abs(m.beneficio))}`}
                className="relative h-full min-w-0 flex-1 rounded-sm hover:bg-niebla/70"
              >
                <div
                  className={cn(
                    "absolute inset-x-[15%] mx-auto max-w-6",
                    m.beneficio >= 0 ? "rounded-t bg-exito" : "rounded-b bg-error",
                  )}
                  style={
                    m.beneficio >= 0
                      ? { bottom: `${100 - cero}%`, height: `${altura}%` }
                      : { top: `${cero}%`, height: `${altura}%` }
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="pl-12">
        <EtiquetasMeses meses={meses} />
      </div>
      <Leyenda
        elementos={[
          { clase: "bg-exito", texto: "Mes con beneficio (por encima del 0)" },
          { clase: "bg-error", texto: "Mes con pérdidas (por debajo del 0)" },
        ]}
      />
    </figure>
  );
}

/** Dinero ganado (o perdido) en total desde el primer mes del periodo: una línea */
export function GraficoAcumulado({ meses }: { meses: Mes[] }) {
  const valores = meses.map((m) => m.acumulado);
  const arriba = techo(Math.max(0, ...valores));
  const perdida = Math.max(0, ...valores.map((v) => -v));
  const abajo = perdida > 0 ? -techo(perdida) : 0;
  const alto = arriba - abajo;
  // Coordenadas en un lienzo de 100 × 100 que se estira al tamaño de la caja
  const x = (i: number) => (meses.length === 1 ? 50 : (i / (meses.length - 1)) * 100);
  const y = (v: number) => ((arriba - v) / alto) * 100;
  const puntos = valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const ultimo = meses[meses.length - 1];

  return (
    <figure>
      <div className="relative h-48 pl-12">
        <Rejilla maximo={arriba} minimo={abajo} />
        <div className="relative h-full">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            role="img"
            aria-label={`Dinero acumulado. Al final del periodo: ${formatearPrecio(ultimo.acumulado)}.`}
          >
            <polygon
              points={`${x(0)},${y(0)} ${puntos} ${x(meses.length - 1)},${y(0)}`}
              className="fill-acento/10"
            />
            <polyline
              points={puntos}
              fill="none"
              className="stroke-acento"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* Puntos (HTML para que sean redondos aunque el SVG se estire) con su cifra al pasar el ratón */}
          {meses.map((m, i) => (
            <span
              key={m.mes}
              title={`${mesLargo(m.mes)}: ${formatearPrecio(m.acumulado)} acumulados`}
              className="group absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${x(i)}%`, top: `${y(m.acumulado)}%` }}
            >
              <span className="size-2 rounded-full bg-acento ring-2 ring-white group-hover:size-3" />
            </span>
          ))}
        </div>
      </div>
      <div className="pl-12">
        <EtiquetasMeses meses={meses} />
      </div>
      <figcaption className="mt-3 text-xs text-gris">
        Suma de lo que se ha ganado y gastado mes a mes. Si la línea sube, la empresa va ganando
        dinero; si baja, está gastando más de lo que entra.
      </figcaption>
    </figure>
  );
}
