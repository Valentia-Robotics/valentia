/**
 * CÓDIGOS QR
 * Usa la librería "qrcode" para dibujar el QR como SVG (imagen vectorial, nítida al imprimir).
 */
import "server-only";
import QRCode from "qrcode";

/** Dirección que abre el QR de la caja: /activar?codigo=XXXX */
export function urlActivacion(codigo: string): string {
  const web = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
