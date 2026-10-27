/**
 * ESTADÍSTICAS DE VISITAS DEL PANEL (/admin/visitas)
 * Cifras de los últimos días a partir de la tabla Visita (ver src/app/api/visitas/route.ts).
 */
import "server-only";
import { db } from "@/lib/db";
import { diaEnEspana, ultimosDias } from "@/lib/visitas/reglas";

/** Periodos que se pueden elegir en la página */
export const PERIODOS = [7, 30, 90] as const;
export type Periodo = (typeof PERIODOS)[number];

export function leerPeriodo(valor: unknown): Periodo {
  const numero = Number(valor);
  return (PERIODOS as readonly number[]).includes(numero) ? (numero as Periodo) : 30;
}

/** Nombres fáciles de leer para las páginas fijas */
const PAGINAS: Record<string, string> = {
  "/": "Portada",
  "/kits": "Todos los kits",
  "/componentes": "Componentes",
  "/configurador": "Configurador",
  "/carrito": "Carrito",
  "/checkout": "Pago",
  "/pedido": "Pedido hecho",
  "/activar": "Activar código",
  "/login": "Iniciar sesión",
  "/registro": "Crear cuenta",
  "/verificar": "Código por email",
  "/recuperar": "Recuperar contraseña",
  "/cuenta": "Mi cuenta",
  "/cursos": "Mis cursos",
  "/legal/privacidad": "Privacidad",
  "/legal/cookies": "Cookies",
  "/legal/aviso-legal": "Aviso legal",
  "/legal/condiciones": "Condiciones de venta",
  "/legal/devoluciones": "Devoluciones",
};

/** Una fila de una lista ("Google: 25") */
export interface Fila {
  nombre: string;
  /** Ruta de la página, para enlazarla (solo en "páginas más vistas") */
  ruta?: string;
  cantidad: number;
}

const ordenar = (filas: Fila[]) => filas.sort((a, b) => b.cantidad - a.cantidad);

export async function obtenerVisitas(periodo: Periodo) {
  const dias = ultimosDias(periodo);
  const enPeriodo = { dia: { gte: dias[0] } };
  const hoy = diaEnEspana();

  const [porDia, personasPorDia, personas, paginas, origenes, dispositivos, kits, cursos] =
    await Promise.all([
      db.visita.groupBy({ by: ["dia"], where: enPeriodo, _count: { _all: true } }),
      db.visita.groupBy({ by: ["dia", "visitante"], where: enPeriodo }),
      db.visita.groupBy({ by: ["visitante"], where: enPeriodo }),
      db.visita.groupBy({ by: ["ruta"], where: enPeriodo, _count: { _all: true } }),
      db.visita.groupBy({
        by: ["origen"],
        where: { ...enPeriodo, entrada: true },
        _count: { _all: true },
      }),
      db.visita.groupBy({
        by: ["dispositivo"],
        where: { ...enPeriodo, entrada: true },
        _count: { _all: true },
      }),
      db.kit.findMany({ select: { slug: true, nombre: true } }),
      db.curso.findMany({ select: { slug: true, titulo: true } }),
    ]);

  // Visitas y personas de cada día (los días sin visitas salen a 0)
  const paginasDia = new Map(porDia.map((d) => [d.dia, d._count._all]));
  const personasDia = new Map<string, number>();
  for (const { dia } of personasPorDia) personasDia.set(dia, (personasDia.get(dia) ?? 0) + 1);
  const diario = dias.map((dia) => ({
    dia,
    paginas: paginasDia.get(dia) ?? 0,
    personas: personasDia.get(dia) ?? 0,
  }));

  const nombreKit = new Map(kits.map((k) => [`/kits/${k.slug}`, `Kit: ${k.nombre}`]));
  const nombreCurso = new Map(cursos.map((c) => [`/cursos/${c.slug}`, `Curso: ${c.titulo}`]));
  const nombrePagina = (ruta: string) =>
    PAGINAS[ruta] ?? nombreKit.get(ruta) ?? nombreCurso.get(ruta) ?? ruta;

  const NOMBRE_DISPOSITIVO: Record<string, string> = {
    movil: "Móvil",
    ordenador: "Ordenador",
    tableta: "Tableta",
  };

  const totalPaginas = diario.reduce((suma, d) => suma + d.paginas, 0);
  return {
    dias: periodo,
    hoy: diario.find((d) => d.dia === hoy) ?? { dia: hoy, paginas: 0, personas: 0 },
    totalPaginas,
    totalPersonas: personas.length,
    entradas: origenes.reduce((suma, o) => suma + o._count._all, 0),
    diario,
    paginas: ordenar(
      paginas.map((p) => ({ nombre: nombrePagina(p.ruta), ruta: p.ruta, cantidad: p._count._all })),
    ).slice(0, 15),
    origenes: ordenar(
      origenes.map((o) => ({
        nombre: o.origen ?? "Directo",
        cantidad: o._count._all,
      })),
    ).slice(0, 15),
    dispositivos: ordenar(
      dispositivos.map((d) => ({
        nombre: NOMBRE_DISPOSITIVO[d.dispositivo] ?? d.dispositivo,
        cantidad: d._count._all,
      })),
    ),
  };
}
