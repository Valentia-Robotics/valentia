/**
 * TARJETA DE ACTIVACIÓN PARA LÁSER
 * Dibuja en SVG las dos caras (un archivo por cara) de la tarjeta que va dentro de cada kit, listas para
 * grabar con láser sobre cartulina negra YA CORTADA a tamaño tarjeta (Bambu Lab H2C):
 *   - relleno NEGRO = grabar (el láser aclara la cartulina); no hay líneas de corte
 *   - el SVG mide exactamente lo que la tarjeta, y el dibujo va centrado: 4 pequeñas escuadras en las
 *     esquinas hacen que el conjunto ocupe lo mismo en todas las caras (fácil de centrar en el láser)
 *   - todo se funde en una sola superficie sin solapes (fusion.ts)
 * Delante: QR + logo + nombre del kit + código. Detrás: los tres pasos para activar el curso y un
 * dibujo del kit.
 * Las tarjetas de bienvenida (kit `SLUG_KIT_BIENVENIDA`) tienen su propio diseño: delante, el QR y un
 * sello de «Bienvenidos a Valentia»; detrás, los pasos para ver el vídeo, el código y la dirección.
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
import { SLUG_KIT_BIENVENIDA } from "@/config/bienvenida";
import { dibujoKit } from "./dibujosKit";
import { fusionarFormas, type Forma } from "./fusion";
import { medirTexto, textoComoTrazado, type NombreFuente } from "./texto";

/** Tamaño de tarjeta de crédito (ISO 7810 ID-1), en mm, con esquinas de 3 mm */
const W = 85.6;
const H = 54;
/** Las escuadras de las esquinas van a esta distancia del borde; el dibujo, a partir de ZONA */
const ESCUADRA = 2;
const ZONA = 3;

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

// Medidas de la cara delantera
const LADO_QR = 40;
const QY = (H - LADO_QR) / 2;
const CX = 50.5; // columna de texto
const ANCHO_TEXTO = W - CX - 4.5;

/** Lo que cambia con cada código en la cara delantera: el QR y el código */
function delanteraPropia({ codigo, url }: DatosTarjeta): Forma[] {
  return [
    qr(5, QY, LADO_QR, url),
    textoComoTrazado(
      "mono",
      codigo,
      CX,
      QY + 33.2,
      tamanoQueCabe("mono", codigo, 2.85, ANCHO_TEXTO, 2),
    ),
  ];
}

/** Lo que es igual en todas las tarjetas del kit: logo, textos, nombre del kit y dirección */
function delanteraComun({ nombreKit, dominio }: DatosTarjeta): Forma[] {
  const qy = QY;
  const cx = CX;
  const anchoMax = ANCHO_TEXTO;
  const g: Forma[] = [...logo(cx, qy + 0.6, 29, 0.24)];
  g.push(
    textoComoTrazado("textoMedio", "TU CURSO TE ESPERA", cx, qy + 10, 1.55, { espaciado: 0.18 }),
  );
  const { lineas, tam } = lineasNombre(nombreKit, anchoMax);
  lineas.forEach((l, i) =>
    g.push(textoComoTrazado("titulo", l, cx, qy + 12 + tam + i * tam * 1.2, tam)),
  );
  g.push(textoComoTrazado("textoMedio", "TU CÓDIGO", cx, qy + 29, 1.4, { espaciado: 0.18 }));
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

function caraTrasera({ dominio, slugKit }: DatosTarjeta): Forma[] {
  const g: Forma[] = [...logo(6, 7, 40, 0.3)];
  g.push(textoComoTrazado("titulo", "Tu robot empieza aquí", 6, 19, 4.2));
  const pasos = [
    "Escanea el QR de la otra cara",
    "Inicia sesión o crea tu cuenta",
    "Tu curso aparece en «Mis cursos»",
  ];
  pasos.forEach((paso, i) => {
    const y = 25.5 + i * 6.2;
    // Círculo grabado con el número sin grabar dentro
    const numero = textoComoTrazado("textoMedio", String(i + 1), 8.2, y + 0.82, 2.3, {
      alinear: "centro",
    });
    g.push({ d: trazado(circulo(8.2, y, 2.1, true)), menos: numero });
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

// ── Tarjeta de bienvenida ───────────────────────────────────────────────────

/** Centro de la columna derecha de la cara delantera */
const CB = CX + ANCHO_TEXTO / 2;

/**
 * Delante (igual en todas): el cuadrado de la V de Valentia (como el icono de la web: cuadrado grabado y
 * la V sin grabar), unido a dos pistas de circuito
 * con su pad al final, y debajo «BIENVENIDOS A» + el logo. El QR va aparte (cambia con cada código).
 */
function bienvenidaDelanteraComun({ dominio }: DatosTarjeta): Forma[] {
  const cy = QY + 7.2;
  const r = 6.2;
  const lado = 2 * r;
  const g: Forma[] = [
    {
      d: trazado(rectRedondeado(CB - r, cy - r, lado, lado, lado * 0.22, true)),
      menos: uve(CB - r, cy - r, lado),
    },
  ];
  // Pistas a cada lado del sello, como en una placa de circuito
  for (const lado of [-1, 1]) {
    const x0 = CB + lado * (r + 0.2);
    const x1 = CB + lado * (r + 4.2);
    const x2 = CB + lado * (r + 6.4);
    g.push(
      trazado(
        contorno(
          [
            [x0, cy],
            [x1, cy],
            [x2, cy - 2.2],
          ],
          0.32,
        ),
      ),
    );
    g.push(trazado(circulo(x2, cy - 2.2, 0.75, true)) + trazado(circulo(x2, cy - 2.2, 0.3, false)));
  }
  g.push(
    textoComoTrazado("textoMedio", "BIENVENIDOS A", CB, QY + 19.6, 1.7, {
      espaciado: 0.32,
      alinear: "centro",
    }),
  );
  g.push(...logo(CB - 14, QY + 21.4, 28, 0.32));
  g.push(trazado(rect(CB - 4, QY + 27.4, 8, 0.16)));
  ["Escanea el QR y mira", "tu vídeo de bienvenida"].forEach((l, i) =>
    g.push(textoComoTrazado("texto", l, CB, QY + 31.6 + i * 2.4, 1.65, { alinear: "centro" })),
  );
  g.push(
    textoComoTrazado(
      "textoMedio",
      dominio,
      CB,
      QY + 39.4,
      tamanoQueCabe("textoMedio", dominio, 1.6, ANCHO_TEXTO, 1.1),
      {
        alinear: "centro",
      },
    ),
  );
  return g;
}

/** Caja del código en la trasera de bienvenida */
const CAJA_CODIGO = { x: 55.6, y: 8.5, w: 25, h: 31 };
const CC = CAJA_CODIGO.x + CAJA_CODIGO.w / 2;

/** Detrás (igual en todas): logo, pasos, la caja del código (vacía) y el pie */
function bienvenidaTraseraComun({ dominio }: DatosTarjeta): Forma[] {
  const g: Forma[] = [...logo(6, 7, 40, 0.3)];
  const titulo = "Tu vídeo de bienvenida";
  g.push(textoComoTrazado("titulo", titulo, 6, 19, tamanoQueCabe("titulo", titulo, 4.2, 46, 3)));
  const pasos = [
    "Escanea el QR de la otra cara",
    "Crea tu cuenta gratis",
    "Y te llevamos directo al vídeo",
  ];
  pasos.forEach((paso, i) => {
    const y = 25.5 + i * 6.2;
    const numero = textoComoTrazado("textoMedio", String(i + 1), 8.2, y + 0.82, 2.3, {
      alinear: "centro",
    });
    g.push({ d: trazado(circulo(8.2, y, 2.1, true)), menos: numero });
    g.push(
      textoComoTrazado("texto", paso, 12.3, y + 0.8, tamanoQueCabe("texto", paso, 2.2, 39, 1.6)),
    );
  });
  // Caja del código: marco fino; el código se añade aparte (cambia con cada tarjeta)
  const { x, y, w, h } = CAJA_CODIGO;
  g.push(
    trazado(rectRedondeado(x, y, w, h, 2, true)) +
      trazado(rectRedondeado(x + 0.3, y + 0.3, w - 0.6, h - 0.6, 1.7, false)),
  );
  g.push(
    textoComoTrazado("textoMedio", "TU CÓDIGO", CC, y + 6, 1.45, {
      espaciado: 0.2,
      alinear: "centro",
    }),
  );
  g.push(trazado(rect(CC - 5, y + 15.2, 10, 0.16)));
  const direccion = `${dominio}/activar`;
  [
    { t: "¿Sin cámara? Entra en", f: "texto" as const },
    { t: direccion, f: "textoMedio" as const },
    { t: "y escribe el código", f: "texto" as const },
  ].forEach(({ t, f }, i) =>
    g.push(
      textoComoTrazado(f, t, CC, y + 20 + i * 2.6, tamanoQueCabe(f, t, 1.5, w - 3, 1), {
        alinear: "centro",
      }),
    ),
  );
  // Pie igual que en las tarjetas de los kits
  g.push(trazado(rect(6, 44.2, W - 12, 0.16)));
  const tamDominio = tamanoQueCabe("textoMedio", dominio, 1.75, 30, 1.1);
  g.push(textoComoTrazado("textoMedio", dominio, W - 6, 48.6, tamDominio, { alinear: "der" }));
  const lema = "Cualquiera puede construir su propio robot.";
  const anchoLema = W - 12 - medirTexto("textoMedio", dominio, tamDominio) - 3;
  g.push(
    textoComoTrazado("texto", lema, 6, 48.6, tamanoQueCabe("texto", lema, 1.75, anchoLema, 1.1)),
  );
  return g;
}

/** Lo que cambia con cada código en la trasera de bienvenida: el código dentro de su caja */
function bienvenidaTraseraPropia({ codigo }: DatosTarjeta): Forma[] {
  const tam = tamanoQueCabe("mono", codigo, 2.9, CAJA_CODIGO.w - 3, 1.8);
  return [textoComoTrazado("mono", codigo, CC, CAJA_CODIGO.y + 11.2, tam, { alinear: "centro" })];
}

export type CaraTarjeta = "delantera" | "trasera";

/** Escuadras finas en las 4 esquinas: marcan el centro y hacen que todas las caras midan lo mismo */
function escuadras(): string[] {
  const l = 3;
  const e = ESCUADRA;
  return [
    [
      [e, e + l],
      [e, e],
      [e + l, e],
    ],
    [
      [W - e - l, e],
      [W - e, e],
      [W - e, e + l],
    ],
    [
      [W - e, H - e - l],
      [W - e, H - e],
      [W - e - l, H - e],
    ],
    [
      [e + l, H - e],
      [e, H - e],
      [e, H - e - l],
    ],
  ].map((pts) => trazado(contorno(pts as Punto[], 0.3)));
}

// Lo que se repite en todas las tarjetas de un lote se fusiona una sola vez
const fusionadas = new Map<string, string>();
function fusionarComun(clave: string, formas: () => Forma[], conEscuadras: boolean) {
  let d = fusionadas.get(clave);
  if (d === undefined) {
    d = fusionarFormas(formas(), ZONA_DIBUJO, conEscuadras ? escuadras() : []);
    if (fusionadas.size > 100) fusionadas.clear();
    fusionadas.set(clave, d);
  }
  return d;
}

/** Lo que pase de la zona de dibujo (por ejemplo, la línea del circuito) se recorta */
const ZONA_DIBUJO = rect(ZONA, ZONA, W - 2 * ZONA, H - 2 * ZONA);

/** SVG de una cara de la tarjeta, del tamaño exacto de la tarjeta (en mm) y sin líneas de corte */
export function tarjetaLaserSvg(datos: DatosTarjeta, cara: CaraTarjeta): string {
  const clave = JSON.stringify([cara, datos.nombreKit, datos.slugKit, datos.dominio]);
  const bienvenida = datos.slugKit === SLUG_KIT_BIENVENIDA;
  // La parte común y la propia de cada código no se tocan entre sí: basta con juntarlas
  const d = bienvenida
    ? cara === "delantera"
      ? fusionarComun(clave, () => bienvenidaDelanteraComun(datos), true) +
        fusionarFormas([qr(5, QY, LADO_QR, datos.url)], ZONA_DIBUJO)
      : fusionarComun(clave, () => bienvenidaTraseraComun(datos), true) +
        fusionarFormas(bienvenidaTraseraPropia(datos), ZONA_DIBUJO)
    : cara === "delantera"
      ? fusionarComun(clave, () => delanteraComun(datos), true) +
        fusionarFormas(delanteraPropia(datos), ZONA_DIBUJO)
      : fusionarComun(clave, () => caraTrasera(datos), true);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Valentia · tarjeta ${bienvenida ? "de bienvenida" : "de activación"} ${datos.codigo} (${escaparComentario(datos.nombreKit)}) · cara ${cara}
     Tamaño real: ${W} × ${H} mm (la tarjeta ya viene cortada). Material: cartulina negra.
     NEGRO = GRABAR (queda claro). Sin líneas de corte. El texto ya está convertido a formas. -->
<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
  <path id="${cara}-grabar" fill="#000000" stroke="none" d="${d}"/>
</svg>
`;
}

/** El nombre del kit lo escribe el administrador: dentro de un comentario XML no puede llevar "--" */
const escaparComentario = (texto: string) => texto.replace(/-{2,}/g, "-").replace(/[<>&]/g, "");
