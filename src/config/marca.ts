/**
 * Datos de la marca Valentia en un único sitio.
 * Si cambias aquí el nombre, el lema o los enlaces, cambian en toda la web.
 */

export const marca = {
  nombre: "Valentia",
  lema: "Kits de robótica con cursos",
  descripcion:
    "Kits de robótica y componentes con cursos paso a paso. Cualquiera puede atreverse a construir su propio robot.",

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
};

/** Enlaces principales de la barra de navegación */
export const enlacesNavegacion: EnlaceNavegacion[] = [
  { href: "/kits", etiqueta: "Kits" },
  { href: "/componentes", etiqueta: "Componentes" },
  { href: "/configurador", etiqueta: "Configurador" },
  { href: "/cursos", etiqueta: "Mis cursos" },
];

/** Columnas de enlaces del pie de página */
export const columnasPie: { titulo: string; enlaces: EnlaceNavegacion[] }[] = [
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
    ],
  },
  {
    titulo: "Tu cuenta",
    enlaces: [
      { href: "/login", etiqueta: "Iniciar sesión" },
      { href: "/registro", etiqueta: "Crear cuenta" },
    ],
  },
];
