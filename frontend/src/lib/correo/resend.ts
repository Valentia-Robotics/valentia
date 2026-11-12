/**
 * CARTERO REAL: RESEND (https://resend.com)
 * Para activarlo, en el archivo .env:
 *   CORREO_PROVEEDOR="resend"
 *   RESEND_API_KEY="re_…"                      (la clave se crea en resend.com → API Keys)
 *   CORREO_REMITENTE="Valentia <hola@valentiarobotics.com>"  (un dominio verificado en Resend)
 *
 * Usamos su API directamente con fetch, así que no hace falta instalar ningún paquete.
 * Para cambiar a otro servicio, crea un archivo como este y elígelo en index.ts.
 */
import "server-only";
import type { ProveedorCorreo } from "./tipos";

export const correoResend: ProveedorCorreo = {
  nombre: "resend",
  async enviar(correo) {
    const clave = process.env.RESEND_API_KEY;
    const remitente = process.env.CORREO_REMITENTE;
    if (!clave || !remitente) {
      throw new Error("Faltan RESEND_API_KEY o CORREO_REMITENTE en el archivo .env");
    }

    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remitente,
        to: [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
        ...(correo.cabeceras && { headers: correo.cabeceras }),
      }),
    });
    if (!respuesta.ok) {
      throw new Error(
        `Resend no ha aceptado el correo (${respuesta.status}): ${await respuesta.text()}`,
      );
    }
  },
};
