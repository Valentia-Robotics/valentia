/**
 * BLOG: todo lo que lee o cambia artículos en la base de datos.
 * Las reglas están en src/config/blog.ts; las cuentas y filtros, en texto.ts, calidad.ts y cola.ts.
 */
import "server-only";
import { revalidatePath } from "next/cache";
import type { EstadoArticulo, OrigenArticulo } from "@/generated/prisma/enums";
import { ARTICULOS_POR_PAGINA, AUTOR_AUTOMATICO, CALIDAD_BLOG, LARGO_META } from "@/config/blog";
import { db } from "@/lib/db";
import { avisarPaginas } from "@/lib/indexnow";
import { revisarCalidad } from "./calidad";
import { cuandoSaldra, enMadrid, fechaEnMadrid, tocaPublicar } from "./cola";
import {
  contarPalabras,
  contarSubtitulos,
  crearSlug,
  extractoDe,
  markdownAHtml,
  recortar,
} from "./texto";

const web = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const urlArticulo = (slug: string) => `${web()}/blog/${slug}`;

/** Lo que se escribe de un artículo (panel, editor o n8n). Lo demás se calcula. */
export interface DatosArticulo {
  titulo: string;
  contenidoMd: string;
  slug?: string;
  extracto?: string;
  palabraClave?: string;
  metaTitulo?: string;
  metaDescripcion?: string;
  categoria: string;
  etiquetas: string[];
  imagenUrl?: string | null;
  imagenAlt?: string | null;
  imagenCredito?: string | null;
  fuenteUrl?: string | null;
  fuenteTitulo?: string | null;
  kitsRelacionados: string[];
}

/* ---------- Ajustes ---------- */

export async function ajustesBlog() {
  return db.ajustesBlog.upsert({ where: { clave: "blog" }, create: { clave: "blog" }, update: {} });
}

export async function guardarAjustes(datos: {
  autoPublicar: boolean;
  porDia: number;
  hora: string;
}) {
  await db.ajustesBlog.upsert({
    where: { clave: "blog" },
    create: { clave: "blog", ...datos },
    update: datos,
  });
  await reprogramarCola();
}

/* ---------- Preparar y guardar ---------- */

/** HTML limpio, cuentas, metas y motivos de calidad. No guarda nada. */
export async function prepararArticulo(datos: DatosArticulo, excluirId?: string) {
  const contenidoHtml = markdownAHtml(datos.contenidoMd);
  const palabras = contarPalabras(contenidoHtml);
  const extracto = datos.extracto?.trim()
    ? recortar(datos.extracto, LARGO_META.extracto)
    : extractoDe(contenidoHtml);
  const palabraClave = datos.palabraClave?.trim() || datos.titulo;

  const desde = new Date(Date.now() - CALIDAD_BLOG.diasDuplicado * 86_400_000);
  const [kits, recientes] = await Promise.all([
    db.kit.findMany({ select: { slug: true } }),
    db.articulo.findMany({
      where: {
        creadoEn: { gte: desde },
        estado: { not: "RECHAZADO" },
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      select: { titulo: true, palabraClave: true },
    }),
  ]);
  const motivos = revisarCalidad({
    titulo: datos.titulo,
    palabraClave,
    palabras,
    subtitulos: contarSubtitulos(contenidoHtml),
    categoria: datos.categoria,
    kitsPedidos: datos.kitsRelacionados,
    kitsQueExisten: kits.map((k) => k.slug),
    imagenUrl: datos.imagenUrl,
    imagenAlt: datos.imagenAlt,
    recientes,
  });

  return {
    calculado: {
      titulo: datos.titulo,
      contenidoMd: datos.contenidoMd,
      contenidoHtml,
      palabras,
      extracto,
      palabraClave,
      metaTitulo: recortar(datos.metaTitulo?.trim() || datos.titulo, LARGO_META.titulo),
      metaDescripcion: recortar(datos.metaDescripcion?.trim() || extracto, LARGO_META.descripcion),
      categoria: datos.categoria,
      etiquetas: datos.etiquetas,
      imagenUrl: datos.imagenUrl || null,
      imagenAlt: datos.imagenAlt || null,
      imagenCredito: datos.imagenCredito || null,
      fuenteUrl: datos.fuenteUrl || null,
      fuenteTitulo: datos.fuenteTitulo || null,
      kitsRelacionados: datos.kitsRelacionados,
    },
    motivos,
  };
}

/** Un slug que no use otro artículo (ni como dirección antigua): «robot», «robot-2»… */
async function slugLibre(base: string, excluirId?: string) {
  const raiz = crearSlug(base);
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? raiz : `${raiz}-${n}`;
    const [usado, antiguo] = await Promise.all([
      db.articulo.findFirst({
        where: { slug, ...(excluirId ? { id: { not: excluirId } } : {}) },
        select: { id: true },
      }),
      db.slugAntiguoArticulo.findUnique({ where: { slug }, select: { articuloId: true } }),
    ]);
    if (!usado && (!antiguo || antiguo.articuloId === excluirId)) return slug;
  }
  return `${raiz}-${Date.now()}`;
}

export async function crearArticulo(
  datos: DatosArticulo,
  opciones: {
    origen: OrigenArticulo;
    autor: { id: string | null; nombre: string };
    /** Si pasa los filtros: "EN_COLA" (publicación automática) o "PENDIENTE" */
    siPasa: "EN_COLA" | "PENDIENTE";
  },
) {
  const { calculado, motivos } = await prepararArticulo(datos);
  const estado: EstadoArticulo = motivos.length > 0 ? "PENDIENTE" : opciones.siPasa;
  const articulo = await db.articulo.create({
    data: {
      ...calculado,
      slug: await slugLibre(datos.slug || datos.titulo),
      autorNombre: opciones.autor.nombre,
      autorId: opciones.autor.id,
      origen: opciones.origen,
      estado,
      motivos,
    },
    select: { id: true, slug: true, estado: true },
  });
  if (estado === "EN_COLA") await reprogramarCola();
  const final = await db.articulo.findUniqueOrThrow({
    where: { id: articulo.id },
    select: { id: true, slug: true, estado: true, programadoPara: true },
  });
  return { ...final, motivos };
}

/**
 * Guarda los cambios de un artículo. Si estaba publicado y cambia el slug, la dirección vieja
 * redirige a la nueva (301). Devuelve los motivos de calidad, para enseñarlos.
 */
export async function actualizarArticulo(id: string, datos: DatosArticulo) {
  const actual = await db.articulo.findUnique({
    where: { id },
    select: { slug: true, estado: true, publicadoEn: true },
  });
  if (!actual) return null;
  const { calculado, motivos } = await prepararArticulo(datos, id);
  const slug = datos.slug ? await slugLibre(datos.slug, id) : actual.slug;

  if (slug !== actual.slug && actual.publicadoEn) {
    await db.slugAntiguoArticulo.upsert({
      where: { slug: actual.slug },
      create: { slug: actual.slug, articuloId: id },
      update: { articuloId: id },
    });
  }
  // Uno en la cola que ya no pasa los filtros vuelve a esperar al admin
  const estado = actual.estado === "EN_COLA" && motivos.length > 0 ? "PENDIENTE" : actual.estado;
  await db.articulo.update({ where: { id }, data: { ...calculado, slug, motivos, estado } });
  if (actual.estado === "PUBLICADO") refrescarBlog([actual.slug, slug]);
  if (actual.estado === "EN_COLA") await reprogramarCola();
  return { slug, motivos, estado };
}

/* ---------- Estados ---------- */

/** Publica ya: la web se actualiza, Bing se entera (IndexNow) y n8n recibe el aviso */
export async function publicarArticulo(id: string) {
  const articulo = await db.articulo.update({
    where: { id },
    data: { estado: "PUBLICADO", publicadoEn: new Date(), programadoPara: null },
  });
  refrescarBlog([articulo.slug]);
  await Promise.all([avisarPaginas([urlArticulo(articulo.slug)]), avisarN8n(articulo)]);
  await reprogramarCola();
  return articulo;
}

export async function ponerEnCola(id: string) {
  await db.articulo.update({ where: { id }, data: { estado: "EN_COLA" } });
  await reprogramarCola();
}

export async function rechazarArticulo(id: string, motivo: string) {
  const antes = await db.articulo.findUnique({
    where: { id },
    select: { estado: true, slug: true },
  });
  await db.articulo.update({
    where: { id },
    data: { estado: "RECHAZADO", programadoPara: null, ...(motivo ? { motivos: [motivo] } : {}) },
  });
  if (antes?.estado === "PUBLICADO") refrescarBlog([antes.slug]);
  await reprogramarCola();
}

/** Lo quita de la web y vuelve a esperar al admin */
export async function despublicarArticulo(id: string) {
  const articulo = await db.articulo.update({
    where: { id },
    data: { estado: "PENDIENTE", publicadoEn: null },
  });
  refrescarBlog([articulo.slug]);
}

/** El editor manda su artículo (nuevo o corregido) a revisión */
export async function enviarARevision(id: string) {
  await db.articulo.update({ where: { id }, data: { estado: "PENDIENTE" } });
}

/* ---------- Cola ---------- */

async function publicadosHoy(ahora: Date) {
  const { dia } = enMadrid(ahora);
  return db.articulo.count({
    where: { estado: "PUBLICADO", publicadoEn: { gte: fechaEnMadrid(dia, 0) } },
  });
}

/** Vuelve a calcular cuándo saldrá cada artículo de la cola (en orden de llegada) */
export async function reprogramarCola() {
  const ajustes = await ajustesBlog();
  const ahora = new Date();
  const hoy = await publicadosHoy(ahora);
  const cola = await db.articulo.findMany({
    where: { estado: "EN_COLA" },
    orderBy: { creadoEn: "asc" },
    select: { id: true },
  });
  for (const [puesto, { id }] of cola.entries()) {
    await db.articulo.update({
      where: { id },
      data: {
        programadoPara: ajustes.autoPublicar
          ? cuandoSaldra(ahora, ajustes.hora, ajustes.porDia, hoy, puesto)
          : null,
      },
    });
  }
}

/**
 * Lo que hace n8n cada hora: si la publicación automática está encendida, ya es la hora y hoy aún
 * no se han publicado los del día, publica el primero de la cola. Devuelve lo publicado (o null).
 */
export async function publicarSiToca(ahora = new Date()) {
  const ajustes = await ajustesBlog();
  if (!ajustes.autoPublicar)
    return { publicado: null, motivo: "La publicación automática está apagada." };
  const hoy = await publicadosHoy(ahora);
  if (!tocaPublicar(ahora, ajustes.hora, ajustes.porDia, hoy)) {
    return {
      publicado: null,
      motivo:
        hoy >= ajustes.porDia
          ? `Hoy ya se han publicado ${hoy} (máximo ${ajustes.porDia} al día).`
          : `Todavía no son las ${ajustes.hora} en Madrid.`,
    };
  }
  const siguiente = await db.articulo.findFirst({
    where: { estado: "EN_COLA" },
    orderBy: { creadoEn: "asc" },
    select: { id: true },
  });
  if (!siguiente) return { publicado: null, motivo: "La cola está vacía." };
  const articulo = await publicarArticulo(siguiente.id);
  return { publicado: { id: articulo.id, url: urlArticulo(articulo.slug) }, motivo: null };
}

/* ---------- Avisos y registro ---------- */

/** POST al webhook de n8n (N8N_PUBLISH_WEBHOOK) con el artículo recién publicado */
async function avisarN8n(a: {
  id: string;
  titulo: string;
  slug: string;
  extracto: string;
  imagenUrl: string | null;
  etiquetas: string[];
}) {
  const destino = process.env.N8N_PUBLISH_WEBHOOK ?? "";
  if (!/^https:\/\//.test(destino)) return;
  try {
    const respuesta = await fetch(destino, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: a.titulo,
        url: urlArticulo(a.slug),
        excerpt: a.extracto,
        imageUrl: a.imagenUrl,
        tags: a.etiquetas,
      }),
      signal: AbortSignal.timeout(8000),
    });
    await registrarLlamada("webhook n8n (salida)", respuesta.status, null, a.id);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    await registrarLlamada("webhook n8n (salida)", 0, `No se pudo avisar: ${detalle}`, a.id);
  }
}

/** Apunta una llamada de (o a) n8n. De vez en cuando borra las de hace más de 90 días. */
export async function registrarLlamada(
  ruta: string,
  estado: number,
  detalle: string | null,
  articuloId?: string | null,
) {
  try {
    await db.llamadaBlog.create({
      data: {
        ruta,
        estado,
        detalle: detalle?.slice(0, 1000) ?? null,
        articuloId: articuloId ?? null,
      },
    });
    if (Math.random() < 0.02) {
      await db.llamadaBlog.deleteMany({
        where: { fecha: { lt: new Date(Date.now() - 90 * 86_400_000) } },
      });
    }
  } catch (error) {
    console.error("[blog] No se pudo apuntar la llamada.", error);
  }
}

/** Vuelve a generar las páginas del blog, el sitemap y los artículos tocados */
function refrescarBlog(slugs: string[]) {
  // "/blog" con "layout" no renueva la portada del blog (no tiene layout propio): se nombra cada página
  revalidatePath("/blog", "layout");
  revalidatePath("/blog");
  revalidatePath("/blog/pagina/[n]", "page");
  revalidatePath("/blog/categoria/[categoria]", "page");
  revalidatePath("/blog/categoria/[categoria]/pagina/[n]", "page");
  revalidatePath("/blog/rss.xml");
  for (const slug of slugs) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

/* ---------- Lecturas de la web ---------- */

const resumen = {
  id: true,
  slug: true,
  titulo: true,
  extracto: true,
  categoria: true,
  imagenUrl: true,
  imagenAlt: true,
  palabras: true,
  publicadoEn: true,
} as const;

export async function articulosPublicados({
  pagina = 1,
  categoria,
}: {
  pagina?: number;
  categoria?: string;
}) {
  const where = { estado: "PUBLICADO" as const, ...(categoria ? { categoria } : {}) };
  const [articulos, total] = await Promise.all([
    db.articulo.findMany({
      where,
      orderBy: { publicadoEn: "desc" },
      skip: (pagina - 1) * ARTICULOS_POR_PAGINA,
      take: ARTICULOS_POR_PAGINA,
      select: resumen,
    }),
    db.articulo.count({ where }),
  ]);
  return { articulos, paginas: Math.max(1, Math.ceil(total / ARTICULOS_POR_PAGINA)), total };
}

/** Un artículo publicado, o a dónde redirigir si es un slug antiguo */
export async function articuloPublicado(slug: string) {
  const articulo = await db.articulo.findFirst({ where: { slug, estado: "PUBLICADO" } });
  if (articulo) return { articulo, redirigirA: null };
  const antiguo = await db.slugAntiguoArticulo.findUnique({ where: { slug } });
  if (!antiguo) return { articulo: null, redirigirA: null };
  const actual = await db.articulo.findFirst({
    where: { id: antiguo.articuloId, estado: "PUBLICADO" },
    select: { slug: true },
  });
  return { articulo: null, redirigirA: actual?.slug ?? null };
}

/** Otros de la misma categoría (y, si no hay bastantes, los últimos) */
export async function articulosRelacionados(id: string, categoria: string, cuantos = 3) {
  const misma = await db.articulo.findMany({
    where: { estado: "PUBLICADO", categoria, id: { not: id } },
    orderBy: { publicadoEn: "desc" },
    take: cuantos,
    select: resumen,
  });
  if (misma.length >= cuantos) return misma;
  const otros = await db.articulo.findMany({
    where: { estado: "PUBLICADO", id: { notIn: [id, ...misma.map((a) => a.id)] } },
    orderBy: { publicadoEn: "desc" },
    take: cuantos - misma.length,
    select: resumen,
  });
  return [...misma, ...otros];
}

export function todosPublicados() {
  return db.articulo.findMany({
    where: { estado: "PUBLICADO" },
    orderBy: { publicadoEn: "desc" },
    select: {
      slug: true,
      titulo: true,
      extracto: true,
      categoria: true,
      imagenUrl: true,
      publicadoEn: true,
      actualizadoEn: true,
      etiquetas: true,
    },
  });
}

export { AUTOR_AUTOMATICO };
