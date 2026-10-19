/**
 * TARJETA DE ACTIVACIÓN PARA LÁSER
 * Dibuja en un SVG las dos caras de la tarjeta que va dentro de cada kit, lista para grabar y cortar
 * en cartulina negra (probada la idea con una Bambu Lab H2C):
 *   - relleno NEGRO = grabar (el láser aclara la cartulina)
 *   - línea ROJA de 0,1 mm = cortar
 * Delante: QR + logo + nombre del kit + código. Detrás: los tres pasos para activar el curso y un
 * dibujo del kit.
 * Todo son formas (también el texto): no depende de las tipografías del ordenador del láser.
 */
import QRCode from "qrcode";
import {
  circulo,
  contorno,
  rect,
  recortar,
  rectRedondeado,
  sentido,
  trazado,
  type Punto,
} from "./geometria";
import { dibujoKit } from "./dibujosKit";
import { medirTexto, textoComoTrazado, type NombreFuente } from "./texto";

/** Tamaño de tarjeta de crédito (ISO 7810 ID-1), en mm, con esquinas de 3 mm */
const W = 85.6;
const H = 54;
const RADIO = 3;
const MARGEN = 3;
const HUECO = 6;

interface DatosTarjeta {
  codigo: string;
  nombreKit: string;
  /** Slug del kit: elige el dibujo de la cara trasera */
  slugKit?: string;
  /** Dirección completa que abre el QR (…/activar?codigo=…) */
  url: string;
  /** Dominio que se ve escrito en la tarjeta (sin https://) */
  dominio: string;
}

// ── Logo y monograma (mismo trazado que public/images/brand/logo.svg y monograma.svg) ──────────

/** Logo de Valentia de `ancho` mm; `grosorMm` = grosor real del trazo (el original es muy fino) */
function logo(x: number, y: number, ancho: number, grosorMm: number) {
  const s = ancho / 1231;
  const w = grosorMm / s;
  const m = w / 2;
  const trazos: Punto[][] = [
    [
      [-2.3, -12],
      [51.5, 101],
      [105.7, -12],
    ], // V
    [
      [164.1, 115],
      [222.5, 3],
      [280.9, 115],
    ], // Λ
    [
      [367.5, -5],
      [367.5, 104 - m],
      [439, 104 - m],
    ], // L
    [
      [597, m],
      [521.3, m],
      [521.3, 104 - m],
      [597, 104 - m],
    ], // E
    [
      [521.3 + m, 50.5],
      [588, 50.5],
    ],
    [
      [689, 110],
      [689, 1],
      [777, 103],
      [777, -5],
    ], // N
    [
      [862, m],
      [949, m],
    ], // T
    [
      [905.5, 2 * m],
      [905.5, 110],
    ],
    [
      [1035.5, -5],
      [1035.5, 110],
    ], // I
    [
      [1112.6, 115],
      [1174, 3],
      [1235.4, 115],
    ], // Λ
  ];
  return trazos.map((t) =>
    trazado(
      sentido(
        recortar(contorno(t, w), 0, 0, 1231, 104).map(([px, py]): Punto => [
          x + px * s,
          y + py * s,
        ]),
        true,
      ),
    ),
  );
}

/** La "V" del monograma dentro de un cuadrado de `lado` mm */
function uve(x: number, y: number, lado: number) {
  const s = lado / 512;
  const v = recortar(
    contorno(
      [
        [141, 110],
        [256, 356],
        [371, 110],
      ],
      46,
    ),
    0,
    140,
    512,
    376,
  );
  return trazado(
    sentido(
      v.map(([px, py]): Punto => [x + px * s, y + py * s]),
      true,
    ),
  );
}

// ── QR ────────────────────────────────────────────────────────────────────

/**
 * QR para cartulina negra: se graban (aclaran) los módulos CLAROS y el margen, y los oscuros quedan
 * sin grabar. Resultado: QR normal, oscuro sobre claro, que es como mejor lo leen los móviles.
 * En el centro, la "V" de Valentia (la corrección de errores "H" aguanta hasta un 30 % tapado).
 */
function qr(x: number, y: number, lado: number, url: string) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "H" });
  const n = modules.size;
  const margen = 3;
  const mod = lado / (n + margen * 2);
  const ox = x + margen * mod;
  const oy = y + margen * mod;

  // Hueco de 9 × 9 módulos en el centro, solo si no tapa piezas fijas del QR (patrones de alineación)
  const c0 = Math.floor(n / 2) - 4;
  const c1 = c0 + 8;
  let conLogo = true;
  for (let r = c0; r <= c1; r++)
    for (let c = c0; c <= c1; c++) if (modules.reservedBit[r * n + c]) conLogo = false;
  const enCentro = (r: number, c: number) => conLogo && r >= c0 && r <= c1 && c >= c0 && c <= c1;
  const oscuro = (r: number, c: number) => modules.get(r, c) === 1 && !enCentro(r, c);

  // Fondo claro con agujeros en los módulos oscuros (unidos por filas para que haya menos formas)
  const partes = [trazado(rectRedondeado(x, y, lado, lado, 2, true))];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!oscuro(r, c)) {
        c++;
        continue;
      }
      const inicio = c;
      while (c < n && oscuro(r, c)) c++;
      partes.push(trazado(rect(ox + inicio * mod, oy + r * mod, (c - inicio) * mod, mod, false)));
    }
  }
  if (conLogo) {
    // Cuadrado negro (sin grabar) con la V grabada, y un módulo claro alrededor
    const ix = ox + (c0 + 1) * mod;
    const iy = oy + (c0 + 1) * mod;
    const il = 7 * mod;
    partes.push(trazado(rectRedondeado(ix, iy, il, il, il * 0.22, false)));
    partes.push(uve(ix, iy, il));
  }
  return partes.join("");
}

// ── Utilidades de texto ─────────────────────────────────────────────────────

/** Mayor tamaño (entre tamMin y tamMax) con el que el texto cabe en `anchoMax` mm */
function tamanoQueCabe(
  fuente: NombreFuente,
  texto: string,
  tamMax: number,
  anchoMax: number,
  tamMin: number,
  espaciado = 0,
) {
  const ancho = medirTexto(fuente, texto, tamMax, espaciado);
  return ancho <= anchoMax ? tamMax : Math.max(tamMin, (tamMax * anchoMax) / ancho);
}

/** Parte el nombre en una o dos líneas equilibradas, bajando el tamaño si hace falta */
function lineasNombre(nombre: string, anchoMax: number) {
  const palabras = nombre.trim().split(/\s+/);
  let mejor = { lineas: [nombre.trim()], tam: 2.4 };
  for (let tam = 3.4; tam >= 2.4 - 1e-9; tam -= 0.2) {
    if (medirTexto("titulo", nombre, tam) <= anchoMax) return { lineas: [nombre.trim()], tam };
    let opcion: string[] | null = null;
    let peor = Infinity;
    for (let i = 1; i < palabras.length; i++) {
      const par = [palabras.slice(0, i).join(" "), palabras.slice(i).join(" ")];
      const ancho = Math.max(...par.map((l) => medirTexto("titulo", l, tam)));
      if (ancho < peor) [peor, opcion] = [ancho, par];
    }
    if (opcion && peor <= anchoMax) return { lineas: opcion, tam };
    if (opcion) mejor = { lineas: opcion, tam };
  }
  return mejor;
}

// ── Caras ───────────────────────────────────────────────────────────────────

function caraDelantera({ codigo, nombreKit, url, dominio }: DatosTarjeta): string[] {
  const lado = 40;
  const qy = (H - lado) / 2;
  const cx = 50.5; // columna de texto
  const anchoMax = W - cx - 4.5;
  const g = [qr(5, qy, lado, url), ...logo(cx, qy + 0.6, 29, 0.24)];
  g.push(
    textoComoTrazado("textoMedio", "TU CURSO TE ESPERA", cx, qy + 10, 1.55, { espaciado: 0.18 }),
  );
  const { lineas, tam } = lineasNombre(nombreKit, anchoMax);
  lineas.forEach((l, i) =>
    g.push(textoComoTrazado("titulo", l, cx, qy + 12 + tam + i * tam * 1.2, tam)),
  );
  g.push(textoComoTrazado("textoMedio", "TU CÓDIGO", cx, qy + 29, 1.4, { espaciado: 0.18 }));
  g.push(
    textoComoTrazado(
      "mono",
      codigo,
      cx,
      qy + 33.2,
      tamanoQueCabe("mono", codigo, 2.85, anchoMax, 2),
    ),
  );
  const direccion = `${dominio}/activar`;
  g.push(
    textoComoTrazado(
      "texto",
      direccion,
      cx,
      qy + 39.4,
      tamanoQueCabe("texto", direccion, 1.6, anchoMax, 1.1),
    ),
  );
  return g;
}

function caraTrasera({ dominio, slugKit }: DatosTarjeta): string[] {
  const g = [...logo(6, 7, 40, 0.3)];
  g.push(textoComoTrazado("titulo", "Tu robot empieza aquí", 6, 19, 4.2));
  const pasos = [
    "Escanea el QR de la otra cara",
    "Inicia sesión o crea tu cuenta",
    "Tu curso aparece en «Mis cursos»",
  ];
  pasos.forEach((paso, i) => {
    const y = 25.5 + i * 6.2;
    // Círculo grabado con el número sin grabar dentro (por eso va con "evenodd")
    const numero = textoComoTrazado("textoMedio", String(i + 1), 8.2, y + 0.82, 2.3, {
      alinear: "centro",
    });
    g.push(`<path fill-rule="evenodd" d="${trazado(circulo(8.2, y, 2.1, true))}${numero}"/>`);
    g.push(textoComoTrazado("texto", paso, 12.3, y + 0.8, 2.2));
  });
  g.push(trazado(rect(6, 44.2, W - 12, 0.16)));
  // Pie: lema a la izquierda y dominio a la derecha (el dominio encoge si es muy largo)
  const tamDominio = tamanoQueCabe("textoMedio", dominio, 1.75, 30, 1.1);
  g.push(textoComoTrazado("textoMedio", dominio, W - 6, 48.6, tamDominio, { alinear: "der" }));
  const lema = "Cualquiera puede construir su propio robot.";
  const anchoLema = W - 12 - medirTexto("textoMedio", dominio, tamDominio) - 3;
  g.push(
    textoComoTrazado("texto", lema, 6, 48.6, tamanoQueCabe("texto", lema, 1.75, anchoLema, 1.1)),
  );
  // Dibujo del kit a la derecha (pistas de circuito si el kit no tiene dibujo propio)
  g.push(...dibujoKit(slugKit));
  return g;
}

/** SVG con las dos caras, una al lado de la otra, en milímetros reales */
export function tarjetaLaserSvg(datos: DatosTarjeta): string {
  const ancho = +(MARGEN * 2 + W * 2 + HUECO).toFixed(2);
  const alto = +(MARGEN * 2 + H).toFixed(2);
  const contornoTarjeta = trazado(rectRedondeado(0, 0, W, H, RADIO));
  const cara = (
    id: string,
    x: number,
    formas: string[],
  ) => `  <g id="${id}" transform="translate(${x} ${MARGEN})">
    <g id="${id}-grabar" fill="#000000" stroke="none">
${formas.map((d) => `      ${d.startsWith("<") ? d : `<path d="${d}"/>`}`).join("\n")}
    </g>
    <g id="${id}-cortar" fill="none" stroke="#FF0000" stroke-width="0.1">
      <path d="${contornoTarjeta}"/>
    </g>
  </g>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Valentia · tarjeta de activación ${datos.codigo} (${escaparComentario(datos.nombreKit)})
     Medidas reales en mm: ${W} × ${H} por cara. Material: cartulina negra.
     NEGRO relleno = GRABAR · ROJO 0,1 mm = CORTAR. El texto ya está convertido a formas. -->
<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}mm" height="${alto}mm" viewBox="0 0 ${ancho} ${alto}">
${cara("delantera", MARGEN, caraDelantera(datos))}
${cara("trasera", MARGEN + W + HUECO, caraTrasera(datos))}
</svg>
`;
}

/** El nombre del kit lo escribe el administrador: dentro de un comentario XML no puede llevar "--" */
const escaparComentario = (texto: string) => texto.replace(/-{2,}/g, "-").replace(/[<>&]/g, "");
