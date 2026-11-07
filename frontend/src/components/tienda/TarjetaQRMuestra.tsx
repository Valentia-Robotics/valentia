/**
 * La tarjeta de activación que va dentro de cada caja, tal como sale del láser: cartulina negra
 * con el dibujo grabado (queda de color claro). Se dibuja con el mismo generador que las tarjetas
 * de verdad (src/lib/tarjetaLaser/muestra.ts), así que si cambia la tarjeta, cambia también aquí.
 * Detrás, la cara con los pasos; delante, la del QR. El QR lleva a /activar (código de muestra).
 *
 * Las caras son imágenes aparte (src/app/tarjeta-muestra): el navegador las pide solo al acercarse
 * a esta sección, en vez de descargar ~1,3 MB de trazados con la portada.
 */

function Cara({ cara, className }: { cara: "delantera" | "trasera"; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG propio: next/image no aporta nada
    <img
      src={`/tarjeta-muestra/${cara}.svg`}
      alt={
        cara === "delantera"
          ? "Tarjeta de activación de Valentia con el código QR"
          : "Trasera de la tarjeta de activación con los pasos para empezar el curso"
      }
      width={856}
      height={540}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

export function TarjetaQRMuestra() {
  return (
    // Sin caja de fondo: las tarjetas descansan sobre el blanco de la sección, con su sombra
    <div aria-hidden="true" className="px-2 py-6 sm:px-6 sm:py-10">
      <div className="relative mx-auto w-full max-w-lg pb-[42%]">
        {/* Sombra difusa en el «suelo», bajo las dos tarjetas */}
        <div className="absolute inset-x-[6%] -bottom-[4%] h-[30%] rounded-[50%] bg-tinta/10 blur-2xl" />
        {/* Cara de los pasos, detrás y un poco girada */}
        <Cara
          cara="trasera"
          className="relative h-auto w-[88%] translate-x-[12%] rotate-[3deg] rounded-[3.5%] shadow-[0_18px_40px_-18px_rgb(11_11_11/0.45)]"
        />
        {/* Cara del QR, delante */}
        <Cara
          cara="delantera"
          className="absolute top-[50%] left-0 h-auto w-[72%] -rotate-[6deg] rounded-[3.5%] shadow-[0_24px_50px_-16px_rgb(11_11_11/0.55)]"
        />
      </div>
    </div>
  );
}
