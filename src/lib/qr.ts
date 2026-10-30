/**
 * CÓDIGOS QR
 * Usa la librería "qrcode" para dibujar el QR como SVG (imagen vectorial, nítida al imprimir).
 */
import "server-only";
import QRCode from "qrcode";

/** La web publicada: la que llevan siempre las tarjetas, aunque se generen en el ordenador */
const WEB_PUBLICA = "https://valentiarobotics.com";

/**
 * Dirección que abre el QR de la caja: /activar?codigo=XXXX
 * Las tarjetas se imprimen o se graban para siempre, así que nunca llevan una dirección local
 * (localhost o 127.0.0.1): si la web está en el ordenador, usan la publicada.
 */
export function urlActivacion(codigo: string): string {
  const configurada = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const local = !configurada || /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$|\/)/.test(configurada);
  const web = local ? WEB_PUBLICA : configurada;
  return `${web}/activar?codigo=${encodeURIComponent(codigo)}`;
}

/**
 * Devuelve el QR como texto SVG.
 * Usa el nivel de corrección de errores más alto ("H": aguanta hasta un 30 % tapado),
 * para poder poner el logo de Valentia en el centro sin que deje de leerse.
 */
export function generarQrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 0,
    color: { dark: "#0B0B0B", light: "#FFFFFF" },
  });
}
