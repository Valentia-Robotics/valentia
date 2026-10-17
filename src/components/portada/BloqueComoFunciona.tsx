import { Package, PlayCircle, Wrench, type LucideIcon } from "lucide-react";
import { Contenedor } from "@/components/ui/Contenedor";
import { formatearNumero } from "@/lib/utils";

const pasos: { icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    icono: Package,
    titulo: "Elige tu kit",
    texto: "Un coche, un brazo robótico o una estación meteorológica. Todo viene en la caja.",
  },
  {
    icono: PlayCircle,
    titulo: "Sigue el curso",
    texto: "Escanea el QR y aprende con vídeos cortos, tests y retos a tu ritmo.",
  },
  {
    icono: Wrench,
    titulo: "Móntalo y prográmalo",
    texto: "Paso a paso, hasta que tu robot cobre vida. Y luego, ¡a inventar!",
  },
];

interface Props {
  /** Cifras reales de la base de datos */
  cifras: { kits: number; componentes: number; lecciones: number };
}

/** Bloque de la portada: tres pasos y unas cifras que aparecen al hacer scroll. */
export function BloqueComoFunciona({ cifras }: Props) {
  const datos = [
    { valor: cifras.kits, texto: "kits listos para montar" },
    { valor: cifras.componentes, texto: "componentes sueltos" },
    { valor: cifras.lecciones, texto: "lecciones en vídeo" },
  ];

  return (
    <section
      aria-labelledby="titulo-como-funciona"
      className="overflow-x-clip bg-white py-24 sm:py-32"
    >
      <Contenedor>
        <div className="aparecer mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium tracking-wide text-acento uppercase">Así de fácil</p>
          <h2 id="titulo-como-funciona" className="mt-3 text-4xl font-medium sm:text-6xl">
            De la caja a tu primer robot.
          </h2>
          <p className="mt-4 text-lg text-gris sm:text-xl">
            Cualquiera puede construir su propio robot. Solo hacen falta ganas.
          </p>
        </div>

        <ol className="mt-16 grid gap-6 md:grid-cols-3">
          {pasos.map(({ icono: Icono, titulo, texto }, i) => (
            <li key={titulo} className="aparecer rounded-tarjeta bg-niebla p-8">
              <span className="flex size-14 items-center justify-center rounded-full bg-tinta text-white">
                <Icono aria-hidden="true" className="size-7" strokeWidth={1.5} />
              </span>
              <h3 className="mt-6 text-2xl font-medium">
                <span className="mr-2 text-acento tabular-nums">{i + 1}.</span>
                {titulo}
              </h3>
              <p className="mt-2 text-gris">{texto}</p>
            </li>
          ))}
        </ol>

        <dl className="mt-20 grid gap-10 border-t border-linea pt-12 text-center sm:grid-cols-3">
          {datos.map(({ valor, texto }, i) => (
            <div key={texto} className={i % 2 === 0 ? "aparecer-izquierda" : "aparecer-derecha"}>
              <dt className="sr-only">{texto}</dt>
              <dd>
                <span className="block font-titulo text-6xl font-medium tabular-nums sm:text-7xl">
                  {formatearNumero(valor)}
                </span>
                <span aria-hidden="true" className="mt-1 block text-gris">
                  {texto}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Contenedor>
    </section>
  );
}
