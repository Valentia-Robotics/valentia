import Image from "next/image";

/**
 * Dibujo decorativo de la tarjeta con QR que va dentro de cada caja.
 * El QR de este dibujo es de adorno: los QR reales se generan en la compra (fase 4).
 */

// Cuadrícula de 21 × 21 módulos. Las esquinas imitan los "ojos" de un QR real
// y el resto se rellena con un patrón fijo (siempre igual, para que no cambie al recargar).
const TAMANO = 21;

function esOjo(f: number, c: number) {
  const enCaja = (f0: number, c0: number) => f >= f0 && f < f0 + 7 && c >= c0 && c < c0 + 7;
  return enCaja(0, 0) || enCaja(0, TAMANO - 7) || enCaja(TAMANO - 7, 0);
}

function moduloOjo(f: number, c: number) {
  const ff = f % (TAMANO - 7) === f ? f : f - (TAMANO - 7);
  const cc = c % (TAMANO - 7) === c ? c : c - (TAMANO - 7);
  const borde = ff === 0 || ff === 6 || cc === 0 || cc === 6;
  const centro = ff >= 2 && ff <= 4 && cc >= 2 && cc <= 4;
  return borde || centro;
}

const modulos: [number, number][] = [];
for (let f = 0; f < TAMANO; f++) {
  for (let c = 0; c < TAMANO; c++) {
    const relleno = esOjo(f, c) ? moduloOjo(f, c) : (f * 7 + c * 13 + ((f * c) % 5)) % 3 === 0;
    // Hueco en el centro para el logo
    const hueco = f >= 8 && f <= 12 && c >= 8 && c <= 12;
    if (relleno && !hueco) modulos.push([f, c]);
  }
}

export function TarjetaQRMuestra() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-xs rotate-[-4deg] rounded-tarjeta bg-white p-6 shadow-flotante ring-1 ring-linea"
    >
      <div className="flex items-center justify-between">
        <Image src="/images/brand/logo.svg" alt="" width={110} height={9} unoptimized />
        <span className="text-[10px] font-medium tracking-wide text-gris uppercase">Tu curso</span>
      </div>
      <div className="relative mt-5">
        <svg
          viewBox={`0 0 ${TAMANO} ${TAMANO}`}
          className="h-auto w-full"
          shapeRendering="crispEdges"
        >
          {modulos.map(([f, c]) => (
            <rect key={`${f}-${c}`} x={c} y={f} width="1" height="1" fill="#0b0b0b" />
          ))}
        </svg>
        <Image
          src="/images/brand/monograma.svg"
          alt=""
          width={48}
          height={48}
          unoptimized
          className="absolute top-1/2 left-1/2 size-[18%] -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      <p className="mt-5 text-center font-mono text-sm tracking-[0.2em] text-tinta">
        VAL-7K2Q-9MXP
      </p>
      <p className="mt-1 text-center text-xs text-gris">Escanéame para empezar</p>
    </div>
  );
}
