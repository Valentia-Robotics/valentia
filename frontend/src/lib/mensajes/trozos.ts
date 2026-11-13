/**
 * PETICIONES POR TROZOS (cabecera Range), para los audios: Safari pide «bytes=0-1» antes de
 * reproducir y, si no le contestan con un 206, no suena.
 * Solo un trozo por petición (lo que piden los navegadores al reproducir).
 */

/**
 * El trozo pedido, con el fin incluido; null = no piden trozo (todo el archivo);
 * "no-vale" = piden algo que no existe (respuesta 416)
 */
export function trozoPedido(
  cabecera: string | null,
  total: number,
): { inicio: number; fin: number } | null | "no-vale" {
  if (!cabecera) return null;
  const encontrado = /^bytes=(\d*)-(\d*)$/.exec(cabecera.trim());
  if (!encontrado) return null; // varios trozos u otra unidad: se manda todo
  const [, desde, hasta] = encontrado;
  if (desde === "" && hasta === "") return null;
  if (total === 0) return "no-vale";
  if (desde === "") {
    // «bytes=-500»: los últimos 500
    const ultimos = Number(hasta);
    if (ultimos === 0) return "no-vale";
    return { inicio: Math.max(0, total - ultimos), fin: total - 1 };
  }
  const inicio = Number(desde);
  if (inicio >= total) return "no-vale";
  const fin = hasta === "" ? total - 1 : Math.min(Number(hasta), total - 1);
  if (fin < inicio) return "no-vale";
  return { inicio, fin };
}
