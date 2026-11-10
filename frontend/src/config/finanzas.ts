/**
 * FINANZAS: REGLAS Y LISTAS (sin base de datos; se pueden usar en el cliente y en las pruebas)
 *
 * Panel /admin/finanzas (solo ADMIN): ingresos y gastos apuntados a mano + los pedidos cobrados
 * en la web, que cuentan solos como ingreso (categoría «Ventas en la web»).
 * Todos los importes van en céntimos e IVA incluido, como el resto de la web.
 */

export type TipoMovimiento = "INGRESO" | "GASTO";

export interface Categoria {
  slug: string;
  nombre: string;
}

/** Categoría de los pedidos de la web: no se elige a mano, la ponen los pedidos */
export const CATEGORIA_VENTAS_WEB: Categoria = { slug: "ventas-web", nombre: "Ventas en la web" };

/** Categorías que se pueden elegir al apuntar un ingreso */
export const CATEGORIAS_INGRESO: Categoria[] = [
  { slug: "ventas-fuera-web", nombre: "Ventas fuera de la web" },
  { slug: "talleres", nombre: "Talleres, colegios y formación" },
  { slug: "colaboraciones", nombre: "Colaboraciones y patrocinios" },
  { slug: "subvenciones", nombre: "Subvenciones y ayudas" },
  { slug: "inversion", nombre: "Aportaciones de socios e inversión" },
  { slug: "otros-ingresos", nombre: "Otros ingresos" },
];

/** Categorías que se pueden elegir al apuntar un gasto */
export const CATEGORIAS_GASTO: Categoria[] = [
  { slug: "componentes", nombre: "Componentes y material" },
  { slug: "fabricacion", nombre: "Fabricación e impresión 3D" },
  { slug: "embalaje-envios", nombre: "Embalaje y envíos" },
  { slug: "marketing", nombre: "Publicidad y marketing" },
  { slug: "software", nombre: "Web, software y suscripciones" },
  { slug: "equipo", nombre: "Herramientas y maquinaria" },
  { slug: "personal", nombre: "Sueldos y colaboradores" },
  { slug: "gestoria", nombre: "Gestoría y servicios profesionales" },
  { slug: "impuestos", nombre: "Impuestos y tasas" },
  { slug: "comisiones", nombre: "Comisiones bancarias y de pago" },
  { slug: "local", nombre: "Local y suministros" },
  { slug: "otros-gastos", nombre: "Otros gastos" },
];

export const categoriasDe = (tipo: TipoMovimiento) =>
  tipo === "INGRESO" ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;

const TODAS = [CATEGORIA_VENTAS_WEB, ...CATEGORIAS_INGRESO, ...CATEGORIAS_GASTO];

/** Nombre de una categoría a partir de su slug (si ya no existe, el propio slug) */
export function nombreCategoria(slug: string): string {
  return TODAS.find((c) => c.slug === slug)?.nombre ?? slug;
}

/** Tipos de IVA de España que se pueden elegir (el primero es el de por defecto) */
export const TIPOS_IVA = [21, 10, 4, 0] as const;

/**
 * IVA que va DENTRO de un importe con IVA incluido.
 * 121,00 € al 21 % → 21,00 € de IVA (y 100,00 € sin IVA).
 */
export function ivaIncluido(importeCentimos: number, porcentaje: number): number {
  if (porcentaje <= 0) return 0;
  return Math.round(importeCentimos - importeCentimos / (1 + porcentaje / 100));
}

/* ---------- Meses y periodos ---------- */

const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Mes de una fecha en España: "2026-11" */
export function mesEnEspana(fecha: Date): string {
  return formatoDia.format(fecha).slice(0, 7);
}

/** Día de una fecha en España: "2026-11-10" (para el campo de fecha del formulario) */
export function diaEnEspana(fecha = new Date()): string {
  return formatoDia.format(fecha);
}

/** "2026-11" → "2026-12" (n = 1) o "2026-10" (n = -1) */
export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Lista de meses de "desde" a "hasta", ambos incluidos */
export function mesesEntre(desde: string, hasta: string, maximo = 120): string[] {
  const meses: string[] = [];
  for (let mes = desde; mes <= hasta && meses.length < maximo; mes = sumarMeses(mes, 1)) {
    meses.push(mes);
  }
  return meses;
}

const formatoMesCorto = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
const formatoMesLargo = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const fechaDeMes = (mes: string) => new Date(`${mes}-15T12:00:00Z`);

/** "2026-11" → "nov" */
export const mesCorto = (mes: string) => formatoMesCorto.format(fechaDeMes(mes)).replace(".", "");
/** "2026-11" → "noviembre de 2026" */
export const mesLargo = (mes: string) => formatoMesLargo.format(fechaDeMes(mes));

/**
 * Periodo que se mira en el panel:
 *   "12m"  → los últimos 12 meses (por defecto)
 *   "2026" → ese año, de enero a diciembre
 *   "todo" → desde el primer apunte hasta hoy
 */
export type Periodo = { tipo: "12m" } | { tipo: "anio"; anio: number } | { tipo: "todo" };

export function leerPeriodo(valor: unknown): Periodo {
  if (valor === "todo") return { tipo: "todo" };
  if (typeof valor === "string" && /^20\d\d$/.test(valor)) {
    return { tipo: "anio", anio: Number(valor) };
  }
  return { tipo: "12m" };
}

export function periodoEnTexto(periodo: Periodo): string {
  if (periodo.tipo === "anio") return String(periodo.anio);
  return periodo.tipo;
}

/** Meses que abarca un periodo. "primerMes" = mes del apunte o pedido más antiguo (para "todo"). */
export function mesesDelPeriodo(periodo: Periodo, mesActual: string, primerMes?: string): string[] {
  if (periodo.tipo === "anio") return mesesEntre(`${periodo.anio}-01`, `${periodo.anio}-12`);
  if (periodo.tipo === "todo" && primerMes && primerMes < mesActual) {
    // Como mucho 10 años hacia atrás, y al menos 12 meses para que el gráfico se lea bien
    const desde = primerMes < sumarMeses(mesActual, -119) ? sumarMeses(mesActual, -119) : primerMes;
    const minimo = sumarMeses(mesActual, -11);
    return mesesEntre(desde < minimo ? desde : minimo, mesActual);
  }
  return mesesEntre(sumarMeses(mesActual, -11), mesActual);
}

/** Fecha de un día del formulario ("2026-11-10") guardada a mediodía UTC: en España es el mismo día */
export function fechaDeDia(dia: string): Date {
  return new Date(`${dia}T12:00:00Z`);
}
