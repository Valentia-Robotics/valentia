/**
 * Datos de la marca Valentia en un único sitio.
 * Si cambias aquí el nombre, el lema o los enlaces, cambian en toda la web.
 */

export const marca = {
  nombre: "Valentia",
  lema: "Kits de robótica para montar, con curso en vídeo",
  descripcion:
    "Kits de robótica para montar en casa, con Arduino o ESP32 y un curso en vídeo que explica cada paso. Si nunca has programado, también es para ti.",

  /**
   * Archivos del logo (en public/images/brand).
   * - claro: para fondos claros (letras negras)
   * - oscuro: para fondos oscuros (letras blancas)
   * Usamos la versión SVG (vectorial) porque se ve nítida a cualquier tamaño.
   * Si prefieres las versiones PNG, cambia a "/images/brand/logo-negro.png" y "/images/brand/logo-blanco.png".
   */
  logo: {
    claro: "/images/brand/logo.svg",
    oscuro: "/images/brand/logo-blanco.svg",
    // Proporción ancho/alto del logo (1231 × 104), para reservar su hueco y que nada "salte" al cargar
    ancho: 1231,
    alto: 104,
  },
} as const;

export type EnlaceNavegacion = {
  href: string;
  etiqueta: string;
  /**
   * Otras direcciones que cuentan como "esta sección" (además de href y sus subpáginas).
   * Por ejemplo, /activar se marca como "Mis cursos".
   */
  tambien?: string[];
};

/** Enlaces principales de la barra de navegación (el que corresponde a la página actual se marca) */
export const enlacesNavegacion: EnlaceNavegacion[] = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/kits", etiqueta: "Kits" },
  { href: "/componentes", etiqueta: "Componentes" },
  { href: "/configurador", etiqueta: "Configurador" },
  { href: "/cursos", etiqueta: "Mis cursos", tambien: ["/activar"] },
];

/**
 * ¿Está la página "ruta" dentro de la sección "enlace"? Cuenta la propia dirección,
 * sus subpáginas (/kits/coche… → Kits) y las de "tambien". "/" solo cuenta en la portada.
 */
export function enSeccion(ruta: string, enlace: Pick<EnlaceNavegacion, "href" | "tambien">) {
  const coincide = (base: string) =>
    base === "/" ? ruta === "/" : ruta === base || ruta.startsWith(`${base}/`);
  return coincide(enlace.href) || (enlace.tambien ?? []).some(coincide);
}

/**
 * Columnas de enlaces del pie de página.
 * "enlacesConSesion" (opcional) sustituye a "enlaces" cuando el usuario ha iniciado sesión.
 */
export const columnasPie: {
  titulo: string;
  enlaces: EnlaceNavegacion[];
  enlacesConSesion?: EnlaceNavegacion[];
}[] = [
  {
    titulo: "Tienda",
    enlaces: [
      { href: "/kits", etiqueta: "Kits" },
      { href: "/componentes", etiqueta: "Componentes" },
      { href: "/configurador", etiqueta: "Crea tu robot" },
      { href: "/carrito", etiqueta: "Carrito" },
    ],
  },
  {
    titulo: "Aprende",
    enlaces: [
      { href: "/cursos", etiqueta: "Mis cursos" },
      { href: "/activar", etiqueta: "Activar mi kit" },
      { href: "/guias", etiqueta: "Guías" },
      { href: "/preguntas-frecuentes", etiqueta: "Preguntas frecuentes" },
    ],
  },
  {
    titulo: "Tu cuenta",
    enlaces: [
      { href: "/login", etiqueta: "Iniciar sesión" },
      { href: "/registro", etiqueta: "Crear cuenta" },
    ],
    enlacesConSesion: [
      { href: "/cuenta", etiqueta: "Mi cuenta" },
      { href: "/cursos", etiqueta: "Mis cursos" },
      { href: "/activar", etiqueta: "Activar un kit" },
    ],
  },
];

/** Páginas legales (pie de página y checkout). ⚠ Son BORRADORES pendientes de revisión. */
export const enlacesLegales: EnlaceNavegacion[] = [
  { href: "/legal/aviso-legal", etiqueta: "Aviso legal" },
  { href: "/legal/privacidad", etiqueta: "Privacidad" },
  { href: "/legal/cookies", etiqueta: "Cookies" },
  { href: "/legal/condiciones", etiqueta: "Condiciones de venta" },
  { href: "/legal/devoluciones", etiqueta: "Devoluciones" },
];
