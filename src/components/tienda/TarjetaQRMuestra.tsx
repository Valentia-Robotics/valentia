import { urlActivacion } from "@/lib/qr";
import { tarjetaLaserSvg, type CaraTarjeta } from "@/lib/tarjetaLaser/tarjeta";

/**
 * La tarjeta de activación que va dentro de cada caja, tal como sale del láser: cartulina negra
 * con el dibujo grabado (queda de color claro). Se dibuja con el mismo generador que las tarjetas
 * de verdad (src/lib/tarjetaLaser), así que si cambia la tarjeta, cambia también aquí.
 * Detrás, la cara con los pasos; delante, la del QR. El QR lleva a /activar (código de muestra).
 */

// La misma web que llevan las tarjetas de verdad (nunca localhost)
const web = new URL(urlActivacion("X")).origin;
const DATOS = {
  codigo: "VAL-7K2Q-9MXP",
  nombreKit: "Estación meteorológica",
  slugKit: "estacion-meteorologica",
  url: `${web}/activar`,
  dominio: new URL(web).host,
};

/** Trazado de lo que se graba en una cara (el atributo d del SVG para el láser) */
function grabado(cara: CaraTarjeta) {
  return tarjetaLaserSvg(DATOS, cara).match(/ d="([^"]*)"/)?.[1] ?? "";
}

function Cara({ cara, className }: { cara: CaraTarjeta; className?: string }) {
  return (
    <svg viewBox="0 0 85.6 54" className={className} role="presentation">
      <rect width="85.6" height="54" rx="3" fill="#151515" />
      {/* Brillo suave de la cartulina */}
      <rect width="85.6" height="54" rx="3" fill="url(#brillo-tarjeta)" />
      <path d={grabado(cara)} fill="#e9e3d6" />
    </svg>
  );
}

export function TarjetaQRMuestra() {
  return (
    <div aria-hidden="true" className="rounded-tarjeta bg-niebla px-6 py-14 sm:px-10 sm:py-20">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="brillo-tarjeta" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.07" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.04" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative mx-auto w-full max-w-md pb-[42%]">
        {/* Cara de los pasos, detrás y un poco girada */}
        <Cara
          cara="trasera"
          className="h-auto w-[88%] translate-x-[12%] rotate-[3deg] rounded-[3.5%] shadow-flotante"
        />
        {/* Cara del QR, delante */}
        <Cara
          cara="delantera"
          className="absolute top-[50%] left-0 h-auto w-[72%] -rotate-[6deg] rounded-[3.5%] shadow-flotante"
        />
      </div>
    </div>
  );
}
