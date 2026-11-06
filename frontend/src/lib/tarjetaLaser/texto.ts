/**
 * TEXTO COMO FORMAS
 * Escribe un texto como trazado SVG usando los contornos de glifos.json (generado con
 * scripts/generar-glifos-tarjeta.mjs). Así el archivo no necesita las tipografías instaladas.
 */
import datos from "./glifos.json";

type Comando = (string | number)[];
interface Fuente {
  em: number;
  glifos: Record<string, { a: number; c: Comando[] }>;
  kerning: Record<string, number>;
}

/** titulo = Jost · texto = Inter · textoMedio = Inter medio · mono = JetBrains Mono */
export type NombreFuente = "titulo" | "texto" | "textoMedio" | "mono";

const fuentes = datos as unknown as Record<NombreFuente, Fuente>;

/** Letra que se puede dibujar: si la fuente no la tiene, se prueba sin tilde y si no, "?" */
function letra(fuente: Fuente, ch: string) {
  if (fuente.glifos[ch]) return ch;
  const sinTilde = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return fuente.glifos[sinTilde] ? sinTilde : "?";
}

interface Opciones {
  /** Espacio extra entre letras, en proporción al tamaño (0.18 = 18 %) */
  espaciado?: number;
  alinear?: "izq" | "centro" | "der";
}

function maquetar(nombre: NombreFuente, texto: string, tam: number, espaciado = 0) {
  const fuente = fuentes[nombre];
  const k = tam / fuente.em;
  const letras = [...texto].map((ch) => letra(fuente, ch));
  let x = 0;
  const posiciones = letras.map((ch, i) => {
    const p = x;
    x += fuente.glifos[ch].a * k + espaciado * tam;
    const siguiente = letras[i + 1];
    if (siguiente) x += (fuente.kerning[ch + siguiente] ?? 0) * k;
    return p;
  });
  const ancho = x - (letras.length ? espaciado * tam : 0);
  return { fuente, k, letras, posiciones, ancho };
}

/** Ancho en mm que ocupará el texto */
export function medirTexto(nombre: NombreFuente, texto: string, tam: number, espaciado = 0) {
  return maquetar(nombre, texto, tam, espaciado).ancho;
}

/** Datos de <path> del texto con la línea base en `y` (tamaño `tam` en mm) */
export function textoComoTrazado(
  nombre: NombreFuente,
  texto: string,
  x: number,
  y: number,
  tam: number,
  { espaciado = 0, alinear = "izq" }: Opciones = {},
): string {
  const { fuente, k, letras, posiciones, ancho } = maquetar(nombre, texto, tam, espaciado);
  const x0 = alinear === "der" ? x - ancho : alinear === "centro" ? x - ancho / 2 : x;
  const f = (n: number) => +n.toFixed(3);
  return letras
    .map((ch, i) => {
      const ox = x0 + posiciones[i];
      return fuente.glifos[ch].c
        .map(([tipo, ...n]) => {
          const nums = n as number[];
          const coords = nums.map((v, j) => f(j % 2 === 0 ? ox + v * k : y + v * k));
          return tipo + coords.join(" ");
        })
        .join("");
    })
    .join("");
}
