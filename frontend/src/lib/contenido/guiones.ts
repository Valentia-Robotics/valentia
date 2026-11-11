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
import { FILTRO_EDITORES } from "@/config/equipo";
import {
  CATEGORIAS_INICIALES,
  ESTADOS_ASIGNABLES,
  ESTADOS_DE_TRABAJO,
  ESTADOS_DEL_EDITOR,
  ESTADOS_EDITABLES,
  ESTADOS_EDITABLES_AUTOR,
  ESTADOS_PROPIOS,
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

/**
 * Ideas de un editor que todavía son solo suyas (borrador o archivada): administración no las ve
 * ni las toca hasta que él las envía a revisión.
 */
const PRIVADO: Prisma.GuionWhereInput = {
  origen: "EDITOR",
  estado: { in: ["BORRADOR", "DESCARTADO"] },
};

/** Las ideas propias de un editor mientras nadie se las ha asignado */
const ideasDe = (autorId: string): Prisma.GuionWhereInput => ({
  creadoPorId: autorId,
  origen: "EDITOR",
  editorId: null,
});

/** Lo que un editor ve: lo que tiene asignado y sus ideas propias */
const delEditor = (editorId: string): Prisma.GuionWhereInput => ({
  OR: [
    { editorId, estado: { in: ESTADOS_DEL_EDITOR } },
    { ...ideasDe(editorId), estado: { in: ESTADOS_PROPIOS } },
  ],
});

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
 * Crea un guion. Es la única puerta de entrada: el panel (borrador, MANUAL), las ideas propias de
 * los editores (borrador, EDITOR) y n8n (pendiente de aprobación, IA, con sus escenas). Ninguno se
 * asigna a un editor sin que el admin lo apruebe.
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
    where: { id, estado: { in: ESTADOS_EDITABLES }, NOT: PRIVADO },
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

/**
 * Cambia el estado si las reglas lo permiten. Un editor solo mueve los guiones que tiene asignados;
 * el autor, sus ideas propias sin asignar; y administración, todo menos las ideas aún privadas.
 */
export function cambiarEstado({ guionId, a, actor, autor, comentario, datos }: Cambio) {
  const soloSuyo: Prisma.GuionWhereInput =
    actor === "EDITOR"
      ? { editorId: autor.id ?? "" }
      : actor === "AUTOR"
        ? ideasDe(autor.id ?? "")
        : { NOT: PRIVADO };
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
      tx.usuario.findFirst({
        where: { id: editorId, ...FILTRO_EDITORES },
        select: { nombre: true },
      }),
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
    // Los descartados solo salen si se piden con el filtro de estado. Las ideas de los editores
    // que aún son solo suyas no salen nunca
    where: { ...filtros, estado: filtros.estado ?? { not: "DESCARTADO" }, NOT: PRIVADO },
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
      creadoPor: { select: { nombre: true } },
      // Solo lo que sale en la lista (las escenas pueden ser largas)
      automatico: { select: { relevancia: true, fuente: { select: { medio: true } } } },
    },
  });
}

/** Un guion para administración (null si no existe o es una idea de un editor aún privada) */
export function guionParaAdmin(id: string) {
  return db.guion.findFirst({
    where: { id, NOT: PRIVADO },
    include: {
      categoria: { select: { nombre: true } },
      kit: { select: { nombre: true, slug: true } },
      editor: { select: { nombre: true, email: true, rolFemenino: true } },
      creadoPor: { select: { id: true, nombre: true } },
      historial: { orderBy: { fecha: "desc" } },
    },
  });
}

/** A quién se puede asignar un guion: los editores y los admins que también editan */
export function editores() {
  return db.usuario.findMany({
    where: FILTRO_EDITORES,
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
    where: { OR: [...FILTRO_EDITORES.OR, { id: { in: ids } }] },
    select: { id: true, nombre: true, email: true },
    orderBy: { nombre: "asc" },
  });
  return { eventos, guiones, personas };
}

/* ---------- Panel de editor: siempre filtrado por su id ---------- */

/** «Mis guiones»: lo asignado y las ideas propias, por fecha límite */
export function guionesDelEditor(editorId: string) {
  return db.guion.findMany({
    where: delEditor(editorId),
    orderBy: { fechaLimite: "asc" },
    take: 1000,
    select: {
      id: true,
      titulo: true,
      estado: true,
      origen: true,
      editorId: true,
      fechaLimite: true,
      plataforma: true,
      plataformaOtra: true,
      duracionObjetivo: true,
      pasosHechos: true,
      actualizadoEn: true,
      categoria: { select: { nombre: true } },
    },
  });
}

/** Un guion del editor (asignado o idea suya), o null si no existe o es de otra persona */
export function guionDelEditor(id: string, editorId: string) {
  return db.guion.findFirst({
    where: { id, ...delEditor(editorId) },
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

/** Una idea propia nueva: empieza en borrador y solo la ve quien la escribe */
export function crearIdeaPropia(datos: DatosGuion, autor: { id: string; nombre: string }) {
  return crearGuion(datos, autor, "EDITOR");
}

/** Cambia el texto de una idea propia (solo en borrador). false si ya no se puede. */
export async function actualizarIdeaPropia(id: string, autorId: string, datos: DatosGuion) {
  const { count } = await db.guion.updateMany({
    where: { id, ...ideasDe(autorId), estado: { in: ESTADOS_EDITABLES_AUTOR } },
    data: datos,
  });
  return count > 0;
}

/**
 * La zona de trabajo del editor: sus notas. En lo asignado, mientras lo trabaja; en sus ideas,
 * mientras no estén archivadas.
 */
export async function guardarNotasEditor(id: string, editorId: string, notasEditor: string) {
  const { count } = await db.guion.updateMany({
    where: {
      id,
      OR: [
        { editorId, estado: { in: ESTADOS_DE_TRABAJO } },
        {
          ...ideasDe(editorId),
          estado: { in: ["BORRADOR", "PENDIENTE_APROBACION", "APROBADO"] },
        },
      ],
    },
    data: { notasEditor },
  });
  return count > 0;
}

/** Los pasos de edición hechos (ya limpios). Solo en lo asignado y mientras lo trabaja. */
export async function guardarPasosEditor(id: string, editorId: string, pasosHechos: string[]) {
  const { count } = await db.guion.updateMany({
    where: { id, editorId, estado: { in: ESTADOS_DE_TRABAJO } },
    data: { pasosHechos },
  });
  return count > 0;
}

/**
 * Hace una idea propia nueva a partir de un guion que el editor puede ver (para reutilizar uno
 * que funcionó). Si la fecha límite ya pasó, la nueva vence en una semana. null si no lo encuentra.
 */
export async function duplicarComoIdea(id: string, autor: { id: string; nombre: string }) {
  const original = await db.guion.findFirst({ where: { id, ...delEditor(autor.id) } });
  if (!original) return null;
  const enUnaSemana = new Date();
  enUnaSemana.setUTCDate(enUnaSemana.getUTCDate() + 7);
  enUnaSemana.setUTCHours(12, 0, 0, 0);
  return crearIdeaPropia(
    {
      titulo: `Copia de ${original.titulo}`.slice(0, 140),
      categoriaId: original.categoriaId,
      plataforma: original.plataforma,
      plataformaOtra: original.plataformaOtra,
      duracionObjetivo: original.duracionObjetivo,
      gancho: original.gancho,
      desarrollo: original.desarrollo,
      llamadaAccion: original.llamadaAccion,
      notasVisuales: original.notasVisuales,
      kitId: original.kitId,
      fechaLimite: original.fechaLimite > new Date() ? original.fechaLimite : enUnaSemana,
    },
    autor,
  );
}
