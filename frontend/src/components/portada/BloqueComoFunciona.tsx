import { Contenedor } from "@/components/ui/Contenedor";
import { formatearNumero } from "@/lib/utils";
import { Etiqueta } from "./Etiqueta";

const pasos: { titulo: string; texto: string; nota: string }[] = [
  {
    titulo: "Elige tu kit",
    texto:
      "Hay un coche, un brazo robótico y una estación meteorológica. En la caja va todo lo necesario, hasta el cable USB.",
    nota: "la caja",
  },
  {
    titulo: "Sigue el curso",
    texto:
      "Escanea con el móvil el QR de la caja y se abre el curso: vídeos cortos que puedes parar y repetir las veces que haga falta.",
    nota: "el QR",
  },
  {
    titulo: "Móntalo y prográmalo",
    texto:
      "Las piezas se enchufan, encajan o se unen con imanes, sin soldar. Cuando funcione, cambia el código y haz que haga otras cosas.",
    nota: "tu robot",
  },
];

interface Props {
  /** Cifras reales de la base de datos */
  cifras: { kits: number; componentes: number; lecciones: number };
}

/**
 * CÓMO FUNCIONA: tres pasos como columnas de un cuaderno (número, línea de puntos, texto) y las
 * cifras reales en grande. Todo alineado a la izquierda, como un cartel, no centrado.
 */
export function BloqueComoFunciona({ cifras }: Props) {
  const datos = [
    { valor: cifras.kits, texto: "kits listos para montar" },
    { valor: cifras.componentes, texto: "piezas sueltas" },
    { valor: cifras.lecciones, texto: "lecciones en vídeo" },
  ];

  return (
    <section
      aria-labelledby="titulo-como-funciona"
      className="overflow-x-clip bg-white pt-20 pb-16 sm:pt-28 sm:pb-20"
    >
      <Contenedor>
        <div className="aparecer grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Etiqueta>Cómo funciona</Etiqueta>
            <h2
              id="titulo-como-funciona"
              className="titular-cartel mt-5 text-5xl font-medium sm:text-7xl"
            >
              De la caja a tu primer robot.
            </h2>
          </div>
          <p className="max-w-md font-serif text-xl leading-snug text-tinta/80">
            Da igual que tengas 10 años o 70. Si alguna vez te has preguntado cómo funciona un
            robot, puedes montar uno.
          </p>
        </div>

        <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {pasos.map(({ titulo, texto, nota }, i) => (
            <li key={titulo} className="aparecer group">
              <div className="flex items-baseline justify-between font-mono text-xs text-tinta/60">
                <span>0{i + 1}</span>
                <span>{nota}</span>
              </div>
              <span
                aria-hidden="true"
                className="linea-puntos mt-2 block h-1 text-tinta/50 transition-colors duration-500 group-hover:text-acento"
              />
              <h3 className="mt-6 text-3xl font-medium tracking-tight">{titulo}</h3>
              <p className="mt-3 text-gris">{texto}</p>
            </li>
          ))}
        </ol>

        <dl className="mt-20 grid gap-px rounded-recto bg-tinta/10 sm:grid-cols-3">
          {datos.map(({ valor, texto }) => (
            <div key={texto} className="aparecer bg-salvia px-6 py-8">
              <dt className="sr-only">{texto}</dt>
              <dd>
                <span className="block font-titulo text-7xl font-medium tracking-tighter tabular-nums sm:text-8xl">
                  {formatearNumero(valor)}
                </span>
                <span aria-hidden="true" className="mt-2 block font-mono text-xs text-tinta/70">
                  ↳ {texto}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Contenedor>
    </section>
  );
}
