/**
 * CONFIGURACIÓN DEL NEGOCIO
 * ──────────────────────────────────────────────────────────────
 * Todo lo que puedes querer cambiar sin tocar el resto del código:
 * zona de envío, gastos de envío, IVA y datos de la empresa.
 *
 * Los importes van en CÉNTIMOS (4,95 € = 495) para evitar errores de redondeo.
 * Después de cambiar algo, reinicia "npm run dev" (o vuelve a publicar la web).
 */

export const tienda = {
  /** Envíos: solo Comunidad Valenciana (por las dos primeras cifras del código postal) */
  envio: {
    nombreZona: "Comunidad Valenciana",
    provincias: [
      { prefijoCP: "03", nombre: "Alicante" },
      { prefijoCP: "46", nombre: "Valencia" },
      { prefijoCP: "12", nombre: "Castellón" },
    ],
    /** Gastos de envío, IVA incluido (provisional) */
    costeCentimos: 495,
    /** A partir de este importe de productos, el envío es gratis (provisional) */
    gratisDesdeCentimos: 5000,
    /** Plazo orientativo que se enseña al cliente */
    plazo: "2–4 días laborables",
  },

  /** Todos los precios de la web llevan este IVA ya incluido */
  ivaPorcentaje: 21,

  /** Días para devolver un pedido sin dar explicaciones (derecho de desistimiento) */
  diasDesistimiento: 14,

  /**
   * Datos de la empresa para el aviso legal, las facturas y los correos.
   * ⚠ RELLENAR ANTES DE PUBLICAR: los textos entre corchetes son marcadores.
   */
  empresa: {
    razonSocial: "[RAZÓN SOCIAL]",
    nombreComercial: "Valentia",
    nif: "[NIF]",
    direccion: "[DIRECCIÓN POSTAL COMPLETA]",
    email: "[EMAIL DE CONTACTO]",
    telefono: "[TELÉFONO DE CONTACTO]",
    registroMercantil: "[DATOS DE INSCRIPCIÓN EN EL REGISTRO MERCANTIL]",
    dominio: "[DOMINIO DE LA WEB]",
  },
} as const;

export type Provincia = (typeof tienda.envio.provincias)[number]["nombre"];

/** Nombres de las provincias a las que enviamos (para el desplegable del checkout) */
export const provinciasEnvio = tienda.envio.provincias.map((p) => p.nombre) as [
  Provincia,
  ...Provincia[],
];

/** true si un dato de la empresa todavía es un marcador del tipo "[NIF]" */
export function esMarcador(texto: string): boolean {
  return /^\[.*\]$/.test(texto);
}
