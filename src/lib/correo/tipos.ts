/**
 * Lo que tiene que saber hacer cualquier "cartero" (la terminal en desarrollo,
 * Resend u otro servicio cuando se publique la web).
 */

/** Un correo ya preparado: a quién va, el asunto y el contenido en HTML y en texto plano */
export interface Correo {
  para: string;
  asunto: string;
  html: string;
  /** Versión sin formato, para programas de correo que no muestran HTML */
  texto: string;
}

export interface ProveedorCorreo {
  nombre: string;
  enviar(correo: Correo): Promise<void>;
}
