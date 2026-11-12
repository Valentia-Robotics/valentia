/**
 * DATOS CONCRETOS DE UN KIT PARA LA PORTADA (funciones puras, con test en datosKit.test.ts).
 * La portada no usa eslóganes: enseña qué hace el kit, qué trae la caja, la edad y el montaje,
 * todo sacado de la base de datos (lo que se cambie en el panel sale aquí solo).
 */

export interface PiezaCaja {
  cantidad: number;
  componente: { nombre: string; categoria: string };
}

/**
 * Lo que hace el kit: sus puntos fuertes, SIN los que hablan del curso o de soldar
 * (eso ya sale en su propia fila de datos y se repetiría).
 */
export function queHace(puntosFuertes: string[]): string[] {
  return puntosFuertes.filter((p) => !/curso|soldar|lecci[oó]n/i.test(p));
}

/**
 * Lo que trae la caja: las piezas del kit con su cantidad y, al final, lo que no es una pieza
 * del catálogo: las baterías (si el kit lleva portapilas), el cable USB y la tarjeta del curso.
 */
export function enLaCaja(piezas: PiezaCaja[]): string[] {
  const lista = piezas.map((p) =>
    p.cantidad > 1 ? `${p.cantidad} × ${p.componente.nombre}` : p.componente.nombre,
  );
  if (piezas.some((p) => p.componente.categoria === "ALIMENTACION")) {
    lista.push("Baterías recargables (ya vienen en la caja)");
  }
  lista.push("Cable USB para programarlo desde el ordenador");
  lista.push("Tarjeta con el código QR del curso");
  return lista;
}

const NUMEROS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];

/** «Tres kits», «Un kit», «12 kits»: el número en letra hasta nueve, como se escribe en un texto */
export function cuantosKits(n: number, mayuscula = false): string {
  const numero = n === 1 ? "un" : n < NUMEROS.length ? NUMEROS[n] : String(n);
  const texto = `${numero} ${n === 1 ? "kit" : "kits"}`;
  return mayuscula ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}
