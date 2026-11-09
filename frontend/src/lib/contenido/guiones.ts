/**
 * GUIONES DE MARKETING: todo lo que lee o cambia guiones en la base de datos.
 * Las reglas del flujo están en src/config/estadosGuion.ts y se comprueban AQUÍ, en el servidor.
 * Cada cambio de estado se guarda en el historial, en la misma transacción.
 *
 * Quien lee como editor pasa siempre su id: la consulta solo encuentra SUS guiones.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaValores } from "@/generated/prisma/client";
import type { EstadoGuion, OrigenGuion } from "@/generated/prisma/enums";
import {
  CATEGORIAS_INICIALES,
  ESTADOS_ASIGNABLES,
  ESTADOS_DE_TRABAJO,
  ESTADOS_DEL_EDITOR,
  ESTADOS_EDITABLES,
  exigeComentario,
  puedeCambiar,
  type ActorGuion,
} from "@/config/estadosGuion";
import { db, transaccion } from "@/lib/db";
import type { DatosGuion } from "@/lib/validaciones/guion";

/** Un cambio que las reglas no permiten: el mensaje se puede enseñar tal cual */
export class ErrorGuion extends Error {}

/** id null = no es una persona (n8n): su nombre queda en el historial */
type Autor = { id: string | null; nombre: string };

/** Las categorías. La primera vez que se piden, crea la lista inicial. */
export async function categoriasGuion(soloActivas = false) {
  if ((await db.categoriaGuion.count()) === 0) {
    await db.categoriaGuion
      .createMany({ data: CATEGORIAS_INICIALES.map((nombre, orden) => ({ nombre, orden })) })
      .catch((error) => {
        // Dos personas abriendo el panel a la vez: la otra ya las ha creado
        const repetido =
          error instanceof PrismaValores.PrismaClientKnownRequestError && error.code === "P2002";
        if (!repetido) throw error;
      });
  }
  return db.categoriaGuion.findMany({
    where: soloActivas ? { activa: true } : {},
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

/** Lo que añade un guion automático (n8n) al crearse */
interface Automatico {
  estado: "BORRADOR" | "PENDIENTE_APROBACION";
  automatico: Prisma.DatosAutomaticosCreateInput;
  /** Normalizada: se apunta como usada en la misma transacción (índice único = sin duplicados) */
  urlNoticia: string;
}

/**
 * Crea un guion. Es la única puerta de entrada: el panel (borrador, MANUAL) y n8n (pendiente de
 * aprobación, IA, con sus escenas). Ninguno llega a un editor sin que el admin lo apruebe.
 */
export function crearGuion(
  datos: DatosGuion,
  autor: Autor,
  origen: OrigenGuion = "MANUAL",
  extra?: Automatico,
) {
  const estado = extra?.estado ?? "BORRADOR";
  return transaccion(async (tx) => {
    const guion = await tx.guion.create({
      data: {
        ...datos,
        creadoPorId: autor.id,
        origen,
        estado,
        automatico: extra?.automatico ?? null,
      },
      select: { id: true },
    });
    if (extra) {
      await tx.noticiaUsada.create({ data: { url: extra.urlNoticia, guionId: guion.id } });
    }
    await tx.cambioEstadoGuion.create({
      data: {
        guionId: guion.id,
        estadoAnterior: null,
        estadoNuevo: estado,
        usuarioId: autor.id,
        usuarioNombre: autor.nombre,
        editorId: null,
        comentario: null,
      },
    });
    return guion;
  });
}

/** Cambia el texto de un guion. Devuelve false si ya no está en un estado editable. */
export async function actualizarGuion(id: string, datos: DatosGuion): Promise<boolean> {
  const { count } = await db.guion.updateMany({
    where: { id, estado: { in: ESTADOS_EDITABLES } },
    data: datos,
  });
  return count > 0;
}

interface Cambio {
  guionId: string;
  a: EstadoGuion;
  actor: ActorGuion;
  autor: Autor;
  comentario?: string;
  /** Datos que se guardan junto al cambio (el enlace del vídeo al entregar) */
  datos?: Prisma.GuionUncheckedUpdateManyInput;
}

/** Cambia el estado si las reglas lo permiten. Un editor solo puede mover sus propios guiones. */
export function cambiarEstado({ guionId, a, actor, autor, comentario, datos }: Cambio) {
  const soloSuyo = actor === "EDITOR" ? { editorId: autor.id ?? "" } : {};
  return transaccion(async (tx) => {
    const guion = await tx.guion.findFirst({
      where: { id: guionId, ...soloSuyo },
      select: { estado: true, editorId: true },
    });
    if (!guion) throw new ErrorGuion("No encontramos ese guion.");
    if (!puedeCambiar(guion.estado, a, actor)) {
      throw new ErrorGuion("Este guion ya no se puede mover a ese estado. Recarga la página.");
    }
    if (exigeComentario(guion.estado, a) && !comentario) {
      throw new ErrorGuion("Explica qué hay que cambiar.");
    }

    // Solo si sigue en el mismo estado: dos clics a la vez no pueden duplicar el cambio
    const { count } = await tx.guion.updateMany({
      where: { id: guionId, estado: guion.estado, ...soloSuyo },
      data: { ...datos, estado: a },
    });
    if (count === 0) throw new ErrorGuion("Otra persona acaba de cambiar este guion.");

    await tx.cambioEstadoGuion.create({
      data: {
        guionId,
        estadoAnterior: guion.estado,
        estadoNuevo: a,
        usuarioId: autor.id,
        usuarioNombre: autor.nombre,
        editorId: guion.editorId,
        comentario: comentario || null,
      },
    });
  });
}

/** Asigna un guion aprobado a un editor, o se lo pasa a otro mientras no esté entregado */
export function asignarGuion(guionId: string, editorId: string, autor: Autor) {
  return transaccion(async (tx) => {
    const [guion, editor] = await Promise.all([
      tx.guion.findUnique({
        where: { id: guionId },
        select: { estado: true, editorId: true, editor: { select: { nombre: true } } },
      }),
      tx.usuario.findFirst({ where: { id: editorId, rol: "EDITOR" }, select: { nombre: true } }),
    ]);
    if (!guion) throw new ErrorGuion("No encontramos ese guion.");
    if (!editor) throw new ErrorGuion("Esa persona no es editora.");
    if (!ESTADOS_ASIGNABLES.includes(guion.estado)) {
      throw new ErrorGuion("Solo se puede asignar un guion aprobado.");
    }
    if (guion.editorId === editorId) throw new ErrorGuion("Ya tiene este guion asignado.");

    const { count } = await tx.guion.updateMany({
      where: { id: guionId, estado: guion.estado },
      data: { estado: "ASIGNADO", editorId },
    });
    if (count === 0) throw new ErrorGuion("Otra persona acaba de cambiar este guion.");

    await tx.cambioEstadoGuion.create({
      data: {
        guionId,
        estadoAnterior: guion.estado,
        estadoNuevo: "ASIGNADO",
        usuarioId: autor.id,
        usuarioNombre: autor.nombre,
        editorId,
        comentario: guion.editor
          ? `Reasignado: ${guion.editor.nombre} → ${editor.nombre}`
          : `Asignado a ${editor.nombre}`,
      },
    });
  });
}

/** Un guion automático todavía sin editor se puede descartar */
export const ESTADOS_DESCARTABLES: EstadoGuion[] = ["BORRADOR", "PENDIENTE_APROBACION", "APROBADO"];

/**
 * Descarta un guion automático: NO se borra, pasa a DESCARTADO con su cambio en el historial (se puede
 * recuperar). La noticia sigue apuntada como usada: n8n no la vuelve a mandar como guion nuevo.
 * Devuelve false si ya no se puede (lo han asignado, no es automático…).
 */
export function descartarGuion(id: string, autor: Autor) {
  return transaccion(async (tx) => {
    const guion = await tx.guion.findFirst({
      where: { id, origen: "IA", editorId: null, estado: { in: ESTADOS_DESCARTABLES } },
      select: { id: true, estado: true },
    });
    if (!guion) return false;
    const { count } = await tx.guion.updateMany({
      where: { id, editorId: null, estado: guion.estado },
      data: { estado: "DESCARTADO" },
    });
    if (count === 0) throw new ErrorGuion("Otra persona acaba de cambiar este guion.");
    await tx.cambioEstadoGuion.create({
      data: {
        guionId: id,
        estadoAnterior: guion.estado,
        estadoNuevo: "DESCARTADO",
        usuarioId: autor.id,
        usuarioNombre: autor.nombre,
        editorId: null,
        comentario: null,
      },
    });
    return true;
  });
}

/** Recupera un guion descartado: vuelve a «Pendiente de aprobación». false si ya no está descartado */
export function recuperarGuion(id: string, autor: Autor) {
  return transaccion(async (tx) => {
    const { count } = await tx.guion.updateMany({
      where: { id, estado: "DESCARTADO" },
      data: { estado: "PENDIENTE_APROBACION" },
    });
    if (count === 0) return false;
    await tx.cambioEstadoGuion.create({
      data: {
        guionId: id,
        estadoAnterior: "DESCARTADO",
        estadoNuevo: "PENDIENTE_APROBACION",
        usuarioId: autor.id,
        usuarioNombre: autor.nombre,
        editorId: null,
        comentario: "Recuperado",
      },
    });
    return true;
  });
}

/* ---------- Panel de admin ---------- */

export function buscarGuiones(filtros: {
  estado?: EstadoGuion;
  categoriaId?: string;
  editorId?: string;
  origen?: OrigenGuion;
}) {
  return db.guion.findMany({
    // Los descartados solo salen si se piden con el filtro de estado
    where: { ...filtros, estado: filtros.estado ?? { not: "DESCARTADO" } },
    orderBy: { fechaLimite: "asc" },
    take: 1000,
    select: {
      id: true,
      titulo: true,
      estado: true,
      origen: true,
      fechaLimite: true,
      categoria: { select: { nombre: true } },
      editor: { select: { nombre: true } },
      // Solo lo que sale en la lista (las escenas pueden ser largas)
      automatico: { select: { relevancia: true, fuente: { select: { medio: true } } } },
    },
  });
}

export function guionParaAdmin(id: string) {
  return db.guion.findUnique({
    where: { id },
    include: {
      categoria: { select: { nombre: true } },
      kit: { select: { nombre: true, slug: true } },
      editor: { select: { nombre: true, email: true } },
      historial: { orderBy: { fecha: "desc" } },
    },
  });
}

export function editores() {
  return db.usuario.findMany({
    where: { rol: "EDITOR" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, email: true },
  });
}

export function kitsParaGuion() {
  return db.kit.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } });
}

/** Todo lo necesario para calcular las métricas */
export async function datosParaMetricas() {
  const [eventos, guiones] = await Promise.all([
    db.cambioEstadoGuion.findMany({
      where: { editorId: { not: null } },
      select: {
        guionId: true,
        estadoAnterior: true,
        estadoNuevo: true,
        editorId: true,
        fecha: true,
      },
    }),
    db.guion.findMany({ select: { id: true, estado: true, editorId: true, fechaLimite: true } }),
  ]);
  const ids = [...new Set(eventos.flatMap((e) => (e.editorId ? [e.editorId] : [])))];
  const personas = await db.usuario.findMany({
    where: { OR: [{ rol: "EDITOR" }, { id: { in: ids } }] },
    select: { id: true, nombre: true, email: true },
    orderBy: { nombre: "asc" },
  });
  return { eventos, guiones, personas };
}

/* ---------- Panel de editor: siempre filtrado por su id ---------- */

export function guionesDelEditor(editorId: string) {
  return db.guion.findMany({
    where: { editorId, estado: { in: ESTADOS_DEL_EDITOR } },
    orderBy: { fechaLimite: "asc" },
    select: {
      id: true,
      titulo: true,
      estado: true,
      fechaLimite: true,
      categoria: { select: { nombre: true } },
    },
  });
}

/** Un guion del editor, o null si no existe o es de otra persona */
export function guionDelEditor(id: string, editorId: string) {
  return db.guion.findFirst({
    where: { id, editorId, estado: { in: ESTADOS_DEL_EDITOR } },
    include: {
      categoria: { select: { nombre: true } },
      kit: { select: { nombre: true, slug: true } },
      // Solo los comentarios de cambios: el resto del historial es para las métricas
      historial: {
        where: { estadoAnterior: "ENTREGADO", estadoNuevo: "EN_PROGRESO" },
        orderBy: { fecha: "desc" },
        select: { id: true, comentario: true, fecha: true, usuarioNombre: true },
      },
    },
  });
}

/** La zona de trabajo del editor: lo único del guion que puede escribir */
export async function guardarNotasEditor(id: string, editorId: string, notasEditor: string) {
  const { count } = await db.guion.updateMany({
    where: { id, editorId, estado: { in: ESTADOS_DE_TRABAJO } },
    data: { notasEditor },
  });
  return count > 0;
}
