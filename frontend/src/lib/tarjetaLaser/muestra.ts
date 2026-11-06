import { urlActivacion } from "@/lib/qr";
import { tarjetaLaserSvg, type CaraTarjeta } from "./tarjeta";

/**
 * La tarjeta de muestra de la portada (TarjetaQRMuestra), tal como sale del láser: cartulina negra
 * con el dibujo grabado (queda de color claro). Usa el mismo generador que las tarjetas de verdad.
 *
 * Se sirve como imagen aparte (/tarjeta-muestra/<cara>.svg) y no dentro del HTML: el trazado del
 * grabado pesa ~640 KB y, metido en la portada, la hacía 3 veces más pesada (salía dos veces: en el
 * HTML y en los datos de React).
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

export const CARAS_MUESTRA: CaraTarjeta[] = ["delantera", "trasera"];

/** SVG de una cara de la tarjeta de muestra, con el color de la cartulina y su brillo */
export function tarjetaMuestraSvg(cara: CaraTarjeta): string {
  const d = tarjetaLaserSvg(DATOS, cara).match(/ d="([^"]*)"/)?.[1] ?? "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85.6 54" width="856" height="540">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.04"/></linearGradient></defs>
<rect width="85.6" height="54" rx="3" fill="#151515"/>
<rect width="85.6" height="54" rx="3" fill="url(#b)"/>
<path d="${d}" fill="#e9e3d6"/>
</svg>
`;
}
