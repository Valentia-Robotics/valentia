import { cn } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";

/** Lo que necesita el esquema de cada pieza (sirve un componente del catálogo tal cual) */
export type ComponenteEsquema = Pick<
  ComponenteCatalogo,
  "slug" | "nombre" | "tipo" | "categoria" | "voltaje" | "voltajeLogico" | "voltajeLogicoMin" | "consumoMa" | "pines" | "conector"
>;
export interface PiezaEsquema {
  componente: ComponenteEsquema;
  cantidad: number;
}

type Estado = "ok" | "aviso" | "error";
interface Bloque {
  clave: string;
  titulo: string;
  detalle: string;
  /** Bus o señal con la que se une a la placa (o a la alimentación) */
  bus: string;
  estado: Estado;
}

const v = (n: number) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 1 })} V`;
const ma = (n: number) => `${n.toLocaleString("es-ES")} mA`;

/**
 * Nombre corto para el bloque: el modelo cuando lo hay («Driver de motores L298N» → «L298N»,
 * «Pantalla OLED de 0,96 pulgadas» → «OLED»); si no, el nombre sin «Placa» ni lo de entre paréntesis.
 */
function corto(nombre: string) {
  const limpio = nombre
    .replace(/^Placa\s+/i, "")
    .replace(/\s+con\s.*$/i, "")
    .replace(/\s*\(.*\)$/, "")
    .trim();
  if (/^(Sensor|Driver|Microservo|Servo|Pantalla|Zumbador|M[oó]dulo)\b/i.test(limpio)) {
    const modelo =
      limpio.match(/\b[A-Z][A-Z0-9-]*\d[A-Z0-9-]*\b/) ?? limpio.match(/\b[A-Z]{3,}\b/);
    if (modelo) return modelo[0];
  }
  return limpio.length > 24 ? `${limpio.slice(0, 23)}…` : limpio;
}

/** Con qué se une cada periférico a la placa */
function busDe(c: ComponenteEsquema, cantidad: number) {
  if (c.tipo === "driver-motores") return "PWM ×2 · GPIO ×4";
  if (c.tipo === "servo") return `PWM ×${cantidad}`;
  if (/i2c/i.test(c.conector)) return "I2C · SDA/SCL";
  if (c.tipo === "sensor-luz") return "ADC";
  if (c.tipo === "sensor-distancia") return "TRIG / ECHO";
  const n = c.pines * cantidad;
  return n > 0 ? `GPIO ×${n}` : "—";
}

/** ¿Se entienden las señales de la pieza con las de la placa? (mismo criterio que reglas.ts) */
function estadoLogica(c: ComponenteEsquema, placa: ComponenteEsquema | undefined): Estado {
  if (!placa?.voltajeLogico || !c.voltajeLogico) return "ok";
  if (c.voltajeLogico > placa.voltajeLogico)
    return (c.voltajeLogicoMin ?? c.voltajeLogico) <= placa.voltajeLogico ? "ok" : "aviso";
  return "ok";
}

/** Reparte las piezas: alimentación, placa y periféricos (los motores DC cuelgan de su driver) */
function analizar(piezas: PiezaEsquema[]) {
  const de = (tipo: string) => piezas.filter((p) => p.componente.tipo === tipo);
  const placa = de("placa")[0]?.componente;
  const fuentes = de("bateria");
  const dc = de("motor-dc").reduce((n, p) => n + p.cantidad, 0);
  const derecha: Bloque[] = [];

  for (const { componente: c, cantidad } of de("driver-motores"))
    derecha.push({
      clave: c.slug,
      titulo: corto(c.nombre),
      detalle: dc > 0 ? `→ ${dc}× motor DC` : "sin motores",
      bus: busDe(c, cantidad),
      estado: estadoLogica(c, placa),
    });
  if (dc > 0 && !de("driver-motores").length)
    derecha.push({
      clave: "motor-dc",
      titulo: `${dc}× motor DC`,
      detalle: "sin driver: no conectar a GPIO",
      bus: "—",
      estado: "error",
    });
  for (const { componente: c, cantidad } of [...de("servo"), ...piezas.filter((p) =>
    ["SENSORES", "EXTRAS"].includes(p.componente.categoria) && p.componente.tipo !== "protoboard",
  )])
    derecha.push({
      clave: c.slug,
      titulo: `${cantidad > 1 ? `${cantidad}× ` : ""}${corto(c.nombre)}`,
      detalle: `${c.voltajeLogico ? v(c.voltajeLogico) : v(c.voltaje)} · ${ma(c.consumoMa * cantidad)}`,
      bus: busDe(c, cantidad),
      estado: estadoLogica(c, placa),
    });

  return { placa, fuentes, derecha, hayDriver: de("driver-motores").length > 0 };
}

const COLOR: Record<Estado, string> = {
  ok: "text-tinta/45",
  aviso: "text-aviso",
  error: "text-error",
};

/**
 * ESQUEMA DE BLOQUES (configurador «banco de pruebas» y portada): alimentación → placa → periféricos,
 * con el bus de cada unión (PWM, I2C, ADC, GPIO) y la tensión. Las uniones de potencia van en naranja;
 * las señales, en gris; si los voltios de las señales no casan, en ámbar o rojo.
 * Dibujo SVG sin JavaScript: sirve en el servidor y en el cliente. Dos trazados: ancho (pantallas
 * grandes) y vertical (móvil), para que la letra no se quede diminuta.
 */
export function EsquemaBloques({
  piezas,
  className,
}: {
  piezas: PiezaEsquema[];
  className?: string;
}) {
  const { placa, fuentes, derecha, hayDriver } = analizar(piezas);
  return (
    <div className={cn("font-mono", className)}>
      <EsquemaAncho placa={placa} fuentes={fuentes} derecha={derecha} hayDriver={hayDriver} />
      <EsquemaVertical placa={placa} fuentes={fuentes} derecha={derecha} />
    </div>
  );
}

type Datos = ReturnType<typeof analizar>;

/** Caja de un bloque: título y detalle; con línea discontinua si falta */
function Caja({
  x,
  y,
  w,
  h,
  titulo,
  detalle,
  falta = false,
  fuerte = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  titulo: string;
  detalle: string;
  falta?: boolean;
  fuerte?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        className={cn(fuerte ? "fill-panel-alto" : "fill-panel", falta ? "stroke-gris-claro" : fuerte ? "stroke-tinta/70" : "stroke-borde-fuerte")}
        strokeDasharray={falta ? "4 3" : undefined}
        strokeWidth={1}
      />
      <text x={x + 10} y={y + 18} className={cn("text-[10.5px]", falta ? "fill-gris" : "fill-tinta")}>
        {titulo}
      </text>
      <text x={x + 10} y={y + 33} className="fill-gris text-[9.5px]">
        {detalle}
      </text>
    </g>
  );
}

function EsquemaAncho({ placa, fuentes, derecha, hayDriver }: Datos) {
  const W = 680;
  const ALTO = 44;
  const HUECO = 12;
  const ARRIBA = 56;
  const filas = Math.max(derecha.length, 1);
  const alturaDerecha = filas * ALTO + (filas - 1) * HUECO;
  const altoMcu = Math.max(alturaDerecha, 104);
  const H = ARRIBA + altoMcu + 28;
  const yMcu = ARRIBA + (altoMcu - Math.max(altoMcu, 104)) / 2;
  const xMcu = 268;
  const wMcu = 144;
  const xDer = 522;
  const wLado = 150;
  const yDer = (i: number) => ARRIBA + (altoMcu - alturaDerecha) / 2 + i * (ALTO + HUECO);
  const fuente = fuentes[0]?.componente;
  const yFuente = ARRIBA + altoMcu / 2 - ALTO / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hidden h-auto w-full sm:block" role="img" aria-label="Esquema de bloques del robot">
      {/* Cabecera de columnas */}
      {[
        [12, "Alimentación"],
        [xMcu, "Control"],
        [xDer, "Periféricos / E/S"],
      ].map(([x, t]) => (
        <text key={t} x={x} y={12} className="fill-gris text-[9px] tracking-[0.08em] uppercase">
          {t}
        </text>
      ))}

      {/* Placa */}
      <Caja
        x={xMcu}
        y={yMcu}
        w={wMcu}
        h={altoMcu}
        titulo={placa ? corto(placa.nombre) : "MCU —"}
        detalle={placa ? `Lógica ${v(placa.voltajeLogico ?? placa.voltaje)}` : "sin placa"}
        falta={!placa}
        fuerte
      />
      {placa && (
        <text x={xMcu + 10} y={yMcu + 48} className="fill-gris text-[9.5px]">
          {placa.pines} GPIO · {ma(placa.consumoMa)}
        </text>
      )}

      {/* Alimentación */}
      <Caja
        x={12}
        y={yFuente}
        w={wLado}
        h={ALTO}
        titulo={fuente ? corto(fuente.nombre) : "Fuente —"}
        detalle={fuente ? `${v(fuente.voltaje)} · ${ma(fuente.consumoMa)} máx.` : "USB 5 V del PC"}
        falta={!fuente}
      />
      <line
        x1={12 + wLado}
        y1={yFuente + ALTO / 2}
        x2={xMcu}
        y2={yFuente + ALTO / 2}
        className={fuente ? "stroke-acento" : "stroke-gris-claro"}
        strokeDasharray={fuente ? undefined : "4 3"}
        strokeWidth={1.25}
      />
      <text x={(12 + wLado + xMcu) / 2} y={yFuente + ALTO / 2 - 6} textAnchor="middle" className="fill-gris text-[9px]">
        {fuente ? `VIN ${v(fuente.voltaje)}` : "5 V USB"}
      </text>
      {/* Potencia directa al driver: por arriba, sin cruzar la placa */}
      {fuente && hayDriver && (
        <>
          <polyline
            points={`${12 + wLado / 2},${yFuente} ${12 + wLado / 2},${ARRIBA - 22} ${xDer + wLado / 2},${ARRIBA - 22} ${xDer + wLado / 2},${yDer(0)}`}
            fill="none"
            className="stroke-acento"
            strokeWidth={1.25}
          />
          <text x={xMcu + wMcu / 2} y={ARRIBA - 27} textAnchor="middle" className="fill-gris text-[9px]">
            VS {v(fuente.voltaje)} → driver
          </text>
        </>
      )}

      {/* Periféricos */}
      {derecha.length === 0 && (
        <Caja x={xDer} y={yDer(0)} w={wLado} h={ALTO} titulo="—" detalle="sin periféricos" falta />
      )}
      {derecha.map((b, i) => {
        const y = yDer(i) + ALTO / 2;
        return (
          <g key={b.clave}>
            <line
              x1={xMcu + wMcu}
              y1={y}
              x2={xDer}
              y2={y}
              stroke="currentColor"
              className={COLOR[b.estado]}
              strokeDasharray={b.estado === "ok" ? undefined : "4 3"}
              strokeWidth={b.estado === "ok" ? 1 : 1.25}
            />
            <circle cx={xMcu + wMcu} cy={y} r={2.5} className="fill-tinta" />
            <text x={(xMcu + wMcu + xDer) / 2} y={y - 5} textAnchor="middle" className={cn("text-[9px]", b.estado === "ok" ? "fill-gris" : b.estado === "aviso" ? "fill-aviso" : "fill-error")}>
              {b.bus}
            </text>
            <Caja x={xDer} y={yDer(i)} w={wLado} h={ALTO} titulo={b.titulo} detalle={b.detalle} />
          </g>
        );
      })}
    </svg>
  );
}

/** Móvil: de arriba abajo (alimentación → placa → periféricos), con letra de tamaño legible */
function EsquemaVertical({ placa, fuentes, derecha }: Omit<Datos, "hayDriver">) {
  const W = 340;
  const ALTO = 42;
  const fuente = fuentes[0]?.componente;
  const yMcu = 74;
  const yLista = yMcu + 64;
  const H = yLista + Math.max(derecha.length, 1) * (ALTO + 10) + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full sm:hidden" role="img" aria-label="Esquema de bloques del robot">
      <Caja
        x={0}
        y={0}
        w={W}
        h={ALTO}
        titulo={fuente ? corto(fuente.nombre) : "Fuente —"}
        detalle={fuente ? `${v(fuente.voltaje)} · ${ma(fuente.consumoMa)} máx.` : "USB 5 V del PC"}
        falta={!fuente}
      />
      <line x1={40} y1={ALTO} x2={40} y2={yMcu} className={fuente ? "stroke-acento" : "stroke-gris-claro"} strokeWidth={1.25} />
      <text x={48} y={(ALTO + yMcu) / 2 + 3} className="fill-gris text-[10px]">
        {fuente ? `VIN ${v(fuente.voltaje)}` : "5 V USB"}
      </text>
      <Caja
        x={0}
        y={yMcu}
        w={W}
        h={48}
        titulo={placa ? corto(placa.nombre) : "MCU —"}
        detalle={placa ? `Lógica ${v(placa.voltajeLogico ?? placa.voltaje)} · ${placa.pines} GPIO` : "sin placa"}
        falta={!placa}
        fuerte
      />
      <line x1={20} y1={yMcu + 48} x2={20} y2={yLista + (Math.max(derecha.length, 1) - 1) * (ALTO + 10) + ALTO / 2} className="stroke-tinta/45" />
      {derecha.length === 0 && <Caja x={40} y={yLista} w={W - 40} h={ALTO} titulo="—" detalle="sin periféricos" falta />}
      {derecha.map((b, i) => {
        const y = yLista + i * (ALTO + 10);
        return (
          <g key={b.clave}>
            <line x1={20} y1={y + ALTO / 2} x2={40} y2={y + ALTO / 2} stroke="currentColor" className={COLOR[b.estado]} />
            <Caja x={40} y={y} w={W - 40} h={ALTO} titulo={b.titulo} detalle={b.detalle} />
            <text x={W - 8} y={y + 18} textAnchor="end" className={cn("text-[9.5px]", b.estado === "ok" ? "fill-gris" : b.estado === "aviso" ? "fill-aviso" : "fill-error")}>
              {b.bus}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
