import { GraduationCap, LogIn, QrCode } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { TarjetaQRMuestra } from "./TarjetaQRMuestra";

const pasos = [
  {
    icono: QrCode,
    titulo: "Escanea el QR de la caja",
    texto: "En la caja va una tarjeta con un código que es solo tuyo y sirve una vez.",
  },
  {
    icono: LogIn,
    titulo: "Inicia sesión",
    texto: "Entra en tu cuenta, o créate una en un minuto. El curso se queda guardado en ella.",
  },
  {
    icono: GraduationCap,
    titulo: "Ve lección a lección",
    texto:
      "En «Mis cursos» tienes los vídeos, un test corto en cada lección y retos para probar con el robot.",
  },
];

/** Bloque de la portada que explica que cada kit incluye un curso que se activa con el QR. */
export function BloqueCursoQR() {
  return (
    <section
      aria-labelledby="titulo-curso-qr"
      className="bg-white pt-6 pb-10 diferido sm:pt-10 sm:pb-12"
    >
      <Contenedor className="grid items-center gap-16 lg:grid-cols-2">
        <div className="aparecer">
          <p className="text-sm font-medium tracking-wide text-acento uppercase">Curso incluido</p>
          <h2 id="titulo-curso-qr" className="mt-3 text-4xl font-medium sm:text-5xl">
            Cada kit viene con su curso.
          </h2>
          <p className="mt-4 max-w-lg text-lg text-gris">
            El curso está hecho para las piezas de ese kit y empieza desde cero, así que no
            necesitas saber programar. Se abre con el código QR de la caja.
          </p>

          <ol className="mt-10 space-y-6">
            {pasos.map(({ icono: Icono, titulo, texto }, i) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-acento/10 text-acento">
                  <Icono aria-hidden="true" className="size-6" strokeWidth={1.6} />
                </span>
                <div>
                  <h3 className="font-sans text-base font-semibold">
                    <span className="sr-only">Paso {i + 1}: </span>
                    {titulo}
                  </h3>
                  <p className="mt-1 text-gris">{texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <Boton href="/activar" variante="enlace" className="mt-8">
            ¿Ya tienes un kit? Activa tu curso ›
          </Boton>
        </div>

        <div className="aparecer">
          <TarjetaQRMuestra />
        </div>
      </Contenedor>
    </section>
  );
}
