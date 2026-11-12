/**
 * MAPA DE PROFUNDIDAD DE LA FOTO DEL TALLER (fondo de la portada).
 *
 * La portada mueve la foto en 3D (paralaje): lo cercano se desplaza más que lo lejano cuando se mueve el
 * ratón o la cámara. Para eso necesita saber a qué distancia está cada zona de la foto: este mapa en
 * gris (blanco = cerca, negro = lejos). Se dibuja a mano con formas sobre la foto de 1672 × 941 px
 * (pared, mueble, abuelo y nieta, portátil, mesa y lo que hay encima) y se difumina para que el
 * movimiento no rasgue los bordes.
 *
 * Uso (desde frontend/): node scripts/profundidad-taller.mjs
 * Si se cambia la foto (public/images/portada/taller-fondo.webp), hay que volver a colocar estas formas.
 */
import sharp from "sharp";

const ANCHO = 1672;
const ALTO = 941;
const SALIDA = "public/images/portada/taller-profundidad.png";

/** Cercanía de 0 (fondo) a 1 (borde delantero de la mesa) → gris */
const g = (v) => {
  const n = Math.round(v * 255);
  return `rgb(${n},${n},${n})`;
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
  <defs>
    <linearGradient id="mesa" x1="0" y1="742" x2="0" y2="${ALTO}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${g(0.5)}"/>
      <stop offset="1" stop-color="${g(1)}"/>
    </linearGradient>
  </defs>
  <!-- Pared, ventana y estanterías -->
  <rect width="${ANCHO}" height="${ALTO}" fill="${g(0.12)}"/>
  <!-- Mueble bajo de la derecha -->
  <rect x="1080" y="610" width="592" height="200" fill="${g(0.22)}"/>
  <!-- Abuelo -->
  <ellipse cx="835" cy="115" rx="95" ry="105" fill="${g(0.42)}"/>
  <path d="M600,180 L1000,180 L1060,300 L1130,520 L1110,600 L1060,760 L485,760 L490,620 L530,430 L560,280Z" fill="${g(0.42)}"/>
  <!-- Nieta y sus manos -->
  <ellipse cx="955" cy="345" rx="90" ry="100" fill="${g(0.46)}"/>
  <path d="M860,420 L1065,420 L1080,700 L1060,760 L845,760 L840,600Z" fill="${g(0.46)}"/>
  <rect x="700" y="590" width="160" height="110" fill="${g(0.46)}"/>
  <!-- Portátil y bote de lápices -->
  <path d="M135,565 L330,565 L600,790 L395,810 L150,770Z" fill="${g(0.55)}"/>
  <rect x="20" y="585" width="105" height="190" fill="${g(0.55)}"/>
  <!-- Tablero de la mesa: más cerca cuanto más abajo -->
  <path d="M0,742 L${ANCHO},792 L${ANCHO},${ALTO} L0,${ALTO}Z" fill="url(#mesa)"/>
  <!-- Piezas impresas que sobresalen por encima del canto (a la distancia de su base) -->
  <rect x="640" y="690" width="115" height="155" fill="${g(0.73)}"/>
  <rect x="928" y="645" width="137" height="180" fill="${g(0.66)}"/>
  <rect x="1140" y="690" width="115" height="190" fill="${g(0.8)}"/>
</svg>`;

await sharp(Buffer.from(svg))
  .blur(16)
  .resize(Math.round(ANCHO / 4), Math.round(ALTO / 4))
  .removeAlpha()
  .toColourspace("b-w")
  .png({ compressionLevel: 9 })
  .toFile(SALIDA);
console.log(`Mapa de profundidad guardado en ${SALIDA}`);
