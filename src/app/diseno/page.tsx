import type { Metadata } from "next";
import Image from "next/image";
import { Logo } from "@/components/marca/Logo";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { MuestraColor } from "./MuestraColor";

/**
 * Página interna para ver de un vistazo el sistema de diseño de Valentia:
 * colores, tipografías, botones y logos. No aparece en Google (noindex).
 */
export const metadata: Metadata = {
  title: "Sistema de diseño",
  robots: { index: false, follow: false },
};

const colores = [
  {
    variable: "--color-tinta",
    nombre: "Tinta",
    uso: "El negro del logo. Textos y botones principales.",
  },
  { variable: "--color-grafito", nombre: "Grafito", uso: "Segundo fondo oscuro." },
  { variable: "--color-niebla", nombre: "Niebla", uso: "Fondo claro para alternar secciones." },
  { variable: "--color-gris", nombre: "Gris", uso: "Texto secundario sobre fondo claro." },
  {
    variable: "--color-gris-claro",
    nombre: "Gris claro",
    uso: "Texto secundario sobre fondo oscuro.",
  },
  { variable: "--color-linea", nombre: "Línea", uso: "Bordes y separadores." },
  { variable: "--color-acento", nombre: "Azul circuito", uso: "Acento: comprar, añadir, enlaces." },
  {
    variable: "--color-acento-claro",
    nombre: "Azul circuito claro",
    uso: "Acento sobre fondos oscuros.",
  },
  { variable: "--color-exito", nombre: "Éxito", uso: "Todo compatible, pedido confirmado." },
  { variable: "--color-aviso", nombre: "Aviso", uso: "Advertencias de compatibilidad." },
  { variable: "--color-error", nombre: "Error", uso: "Incompatibilidades y errores." },
];

export default function SistemaDiseno() {
  return (
    <Contenedor className="py-16 sm:py-24">
      <p className="text-sm font-medium tracking-wide text-acento uppercase">Valentia</p>
      <h1 className="mt-3 text-4xl font-medium sm:text-6xl">Sistema de diseño</h1>
      <p className="mt-4 max-w-2xl text-lg text-gris">
        Todo lo que ves aquí sale de un único archivo:{" "}
        <code className="font-mono text-base">src/app/globals.css</code>. Cambia un valor allí y
        cambiará en toda la web.
      </p>

      {/* Colores */}
      <section aria-labelledby="titulo-colores" className="mt-16">
        <h2 id="titulo-colores" className="text-2xl font-medium">
          Colores
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colores.map((color) => (
            <MuestraColor key={color.variable} {...color} />
          ))}
        </ul>
      </section>

      {/* Tipografía */}
      <section aria-labelledby="titulo-tipografia" className="mt-16">
        <h2 id="titulo-tipografia" className="text-2xl font-medium">
          Tipografía
        </h2>
        <div className="mt-6 space-y-6 rounded-tarjeta border border-linea p-6 sm:p-10">
          <p className="font-titulo text-5xl font-medium tracking-tight sm:text-7xl">
            Jost para titulares
          </p>
          <p className="font-titulo text-3xl font-light tracking-tight">
            Ligera, geométrica, como el logo.
          </p>
          <p className="max-w-2xl text-lg">
            Inter para los textos: muy legible en pantalla, incluso en tamaños pequeños. Así se ve
            un párrafo normal de la web de Valentia.
          </p>
          <p className="text-sm text-gris">Texto secundario en gris, para detalles y notas.</p>
        </div>
      </section>

      {/* Botones */}
      <section aria-labelledby="titulo-botones" className="mt-16">
        <h2 id="titulo-botones" className="text-2xl font-medium">
          Botones
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-tarjeta border border-linea p-6 sm:p-10">
          <Boton>Primario</Boton>
          <Boton variante="acento">Acento</Boton>
          <Boton variante="secundario">Secundario</Boton>
          <Boton variante="enlace">Más información ›</Boton>
          <Boton variante="acento" tamano="xl">
            Añadir
          </Boton>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-tarjeta bg-tinta p-6 sm:p-10">
          <Boton variante="claro">Claro</Boton>
          <Boton variante="acento">Acento</Boton>
          <Boton variante="enlace-claro">Más información ›</Boton>
        </div>
      </section>

      {/* Logo */}
      <section aria-labelledby="titulo-logo" className="mt-16">
        <h2 id="titulo-logo" className="text-2xl font-medium">
          Logo e icono
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex h-48 items-center justify-center rounded-tarjeta border border-linea bg-white p-8">
            <Logo alto={28} />
          </div>
          <div className="flex h-48 items-center justify-center rounded-tarjeta bg-tinta p-8">
            <Logo fondo="oscuro" alto={28} />
          </div>
          <div className="flex h-48 items-center justify-center rounded-tarjeta bg-niebla p-8">
            <Image
              src="/images/brand/monograma.svg"
              alt="Icono de Valentia"
              width={96}
              height={96}
              unoptimized
            />
          </div>
          <div className="flex h-48 flex-col justify-center gap-2 rounded-tarjeta border border-linea p-8 text-sm text-gris">
            <p>
              <strong className="text-tinta">Radios:</strong> botones en píldora, tarjetas de 24 px.
            </p>
            <p>
              <strong className="text-tinta">Sombras:</strong> suaves, para tarjetas y paneles
              flotantes.
            </p>
            <p>
              <strong className="text-tinta">Logo:</strong> no usarlo con menos de 14 px de alto,
              sus trazos son muy finos.
            </p>
          </div>
        </div>
      </section>
    </Contenedor>
  );
}
