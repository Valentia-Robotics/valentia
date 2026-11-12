import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { TarjetaQRMuestra } from "./TarjetaQRMuestra";

/** Bloque de la portada: cada kit trae un curso que se abre con la tarjeta QR de la caja. */
export function BloqueCursoQR() {
  return (
    <section aria-labelledby="titulo-curso-qr" className="bg-white py-20 diferido sm:py-28">
      <Contenedor className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="aparecer">
          <h2 id="titulo-curso-qr" className="titular-cartel text-4xl font-medium sm:text-6xl">
            Cada kit trae su curso.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-tinta/70 sm:text-xl">
            Vídeos cortos que empiezan desde cero. Se abren con la tarjeta que va en la caja.
          </p>
          <Boton href="/activar" variante="secundario" tamano="lg" className="mt-8">
            Ya tengo un kit
          </Boton>
        </div>

        <div className="aparecer">
          <TarjetaQRMuestra />
        </div>
      </Contenedor>
    </section>
  );
}
