/**
 * API DEL BLOG PARA n8n (x-api-key = BLOG_API_KEY). Request/Response normales.
 *   GET  /api/blog/context        → kits, artículos recientes y categorías, para escribir
 *   POST /api/blog/auto           → recibe un artículo: lo valida, pasa los filtros y lo deja en cola o pendiente
 *   POST /api/blog/publicar-cola  → n8n la llama cada hora: publica uno si toca
 * Cada llamada queda en el registro (LlamadaBlog), que se ve en /admin/blog/llamadas.
 * Formato y pasos para conectar n8n: backend/n8n/BLOG.md
 */
import "server-only";
import { z } from "zod";
import { AUTOR_AUTOMATICO, CALIDAD_BLOG, CATEGORIAS_BLOG, estadosArticulo } from "@/config/blog";
import { erroresDeZod } from "@/lib/admin/formularios";
import { comprobarClaveApi } from "@/lib/claveApi";
import { leerCuerpo } from "@/lib/cuerpoLimitado";
import { db } from "@/lib/db";
import { ipDeCabeceras, registrarIntento } from "@/lib/limite";
import { limpiarTexto } from "@/lib/validaciones/guionAutomatico";
import {
  ajustesBlog,
  crearArticulo,
  publicarSiToca,
  registrarLlamada,
  urlArticulo,
} from "./articulos";
import { normalizar, slugDeKit } from "./texto";

/** Un artículo largo con tablas cabe de sobra */
const TAMANO_MAXIMO = 300 * 1024;

const web = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const respuesta = (status: number, cuerpo: unknown) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

/** Clave + límite. Devuelve la respuesta de error (y la apunta en el registro) o null. */
async function entrar(peticion: Request, ruta: string): Promise<Response | null> {
  const rechazo = comprobarClaveApi(peticion, "BLOG_API_KEY");
  if (rechazo) {
    // Los intentos con la clave mal se apuntan, pero no sin fin (alguien podría llenar el registro)
    if (await registrarIntento("blogApiFallos", ipDeCabeceras(peticion.headers))) {
      await registrarLlamada(ruta, rechazo.status, "Clave ausente o incorrecta.");
    }
    return rechazo;
  }
  if (!(await registrarIntento("blogApi", "n8n"))) {
    await registrarLlamada(ruta, 429, "Límite de peticiones por hora.");
    return respuesta(429, { error: "Demasiadas peticiones. Prueba dentro de una hora." });
  }
  return null;
}

/* ---------- GET /api/blog/context ---------- */

export async function contextoBlog(peticion: Request): Promise<Response> {
  const ruta = "GET /api/blog/context";
  const rechazo = await entrar(peticion, ruta);
  if (rechazo) return rechazo;

  const desde = new Date(Date.now() - CALIDAD_BLOG.diasDuplicado * 86_400_000);
  const [kits, recientes] = await Promise.all([
    db.kit.findMany({
      where: { visible: true },
      orderBy: { orden: "asc" },
      select: { slug: true, nombre: true, eslogan: true, descripcion: true, nivel: true },
    }),
    db.articulo.findMany({
      where: { creadoEn: { gte: desde }, estado: { not: "RECHAZADO" } },
      orderBy: { creadoEn: "desc" },
      select: { titulo: true, palabraClave: true, publicadoEn: true, estado: true },
    }),
  ]);
  await registrarLlamada(ruta, 200, `${kits.length} kits, ${recientes.length} artículos recientes`);
  return respuesta(200, {
    kits: kits.map((k) => ({
      name: k.nombre,
      url: `${web()}/kits/${k.slug}`,
      slug: k.slug,
      description: `${k.eslogan} ${k.descripcion}`.trim(),
      keywords: [k.nombre.toLowerCase(), `kit ${k.nombre.toLowerCase()}`, `nivel ${k.nivel.toLowerCase()}`],
    })),
    recentPosts: recientes.map((a) => ({
      title: a.titulo,
      focusKeyword: a.palabraClave,
      publishedAt: a.publicadoEn,
      status: estadosArticulo[a.estado].api,
    })),
    categories: CATEGORIAS_BLOG.map((c) => ({ slug: c.slug, name: c.nombre, description: c.descripcion })),
    rules: {
      minWords: CALIDAD_BLOG.minimoPalabras,
      minH2: CALIDAD_BLOG.minimoSubtitulos,
      imageHosts: ["images.unsplash.com", "images.pexels.com", "cdn.pixabay.com"],
    },
  });
}

/* ---------- POST /api/blog/auto ---------- */

const texto = (maximo: number) =>
  z.string().transform(limpiarTexto).pipe(z.string().max(maximo, `Máximo ${maximo} caracteres`));
const opcional = (maximo: number) => texto(maximo).optional();
const lista = (cuantos: number, maximo: number) =>
  z
    .array(z.string())
    .max(cuantos, `Como mucho ${cuantos}`)
    .optional()
    .transform((l) => [...new Set((l ?? []).map((t) => limpiarTexto(t).slice(0, maximo)))].filter(Boolean));

/** Lo que manda n8n (nombres en inglés, como en su flujo) */
const esquemaEntrada = z.object({
  title: z
    .string({ error: "Falta el título (title)" })
    .transform(limpiarTexto)
    .pipe(z.string().min(5, "El título es demasiado corto").max(200, "Máximo 200 caracteres")),
  content_markdown: z
    .string({ error: "Falta el texto (content_markdown)" })
    .min(1, "El texto está vacío")
    .max(100_000, "El texto es demasiado largo"),
  excerpt: opcional(400),
  focus_keyword: opcional(100),
  meta_title: opcional(120),
  meta_description: opcional(300),
  category: opcional(60),
  tags: lista(15, 40).transform((l) => l.map((t) => t.replace(/^#+/, "").toLowerCase())),
  related_kits: lista(10, 300),
  image_url: opcional(2000),
  image_alt: opcional(300),
  image_credit: opcional(200),
  source_url: opcional(2000).refine(
    (v) => !v || /^https?:\/\/[^\s]+$/.test(v),
    "source_url tiene que empezar por https://",
  ),
  source_title: opcional(300),
});

/** La categoría por su slug o por su nombre («Noticias tech», «noticias-tech»…) */
function categoriaDe(valor?: string): string {
  if (!valor) return "";
  const buscada = normalizar(valor);
  const encontrada = CATEGORIAS_BLOG.find(
    (c) => c.slug === buscada || normalizar(c.nombre) === buscada,
  );
  return encontrada?.slug ?? valor;
}

export async function recibirArticuloAuto(peticion: Request): Promise<Response> {
  const ruta = "POST /api/blog/auto";
  const rechazo = await entrar(peticion, ruta);
  if (rechazo) return rechazo;

  const cuerpo = await leerCuerpo(peticion, TAMANO_MAXIMO);
  if (cuerpo === null) {
    await registrarLlamada(ruta, 413, "Más de 300 KB.");
    return respuesta(413, { error: "El artículo ocupa más de 300 KB." });
  }
  let entrada: unknown;
  try {
    entrada = JSON.parse(cuerpo);
  } catch {
    await registrarLlamada(ruta, 400, "No es JSON válido.");
    return respuesta(400, { error: "El cuerpo no es JSON válido." });
  }

  const leido = esquemaEntrada.safeParse(entrada);
  if (!leido.success) {
    const errores = erroresDeZod(leido.error);
    const error = `El artículo no es válido: ${Object.values(errores)[0]}`;
    await registrarLlamada(ruta, 400, error);
    return respuesta(400, { error, errores });
  }
  const a = leido.data;
  const ajustes = await ajustesBlog();
  const creado = await crearArticulo(
    {
      titulo: a.title,
      contenidoMd: a.content_markdown,
      extracto: a.excerpt,
      palabraClave: a.focus_keyword,
      metaTitulo: a.meta_title,
      metaDescripcion: a.meta_description,
      categoria: categoriaDe(a.category),
      etiquetas: a.tags,
      imagenUrl: a.image_url,
      imagenAlt: a.image_alt,
      imagenCredito: a.image_credit,
      fuenteUrl: a.source_url,
      fuenteTitulo: a.source_title,
      kitsRelacionados: a.related_kits.map(slugDeKit),
    },
    {
      origen: "AUTO",
      autor: { id: null, nombre: AUTOR_AUTOMATICO },
      siPasa: ajustes.autoPublicar ? "EN_COLA" : "PENDIENTE",
    },
  );

  const status = estadosArticulo[creado.estado].api;
  const reasons = [
    ...creado.motivos,
    ...(creado.motivos.length === 0 && !ajustes.autoPublicar
      ? ["La publicación automática está apagada: espera la aprobación del admin."]
      : []),
  ];
  await registrarLlamada(
    ruta,
    201,
    `«${a.title}» → ${status}${creado.motivos.length ? `: ${creado.motivos.join(" ")}` : ""}`,
    creado.id,
  );
  return respuesta(201, {
    status,
    id: creado.id,
    url: urlArticulo(creado.slug),
    scheduledFor: creado.programadoPara?.toISOString() ?? null,
    reasons,
  });
}

/* ---------- POST /api/blog/publicar-cola ---------- */

export async function publicarColaApi(peticion: Request): Promise<Response> {
  const ruta = "POST /api/blog/publicar-cola";
  const rechazo = await entrar(peticion, ruta);
  if (rechazo) return rechazo;
  const { publicado, motivo } = await publicarSiToca();
  await registrarLlamada(
    ruta,
    200,
    publicado ? `Publicado: ${publicado.url}` : motivo,
    publicado?.id,
  );
  return respuesta(200, { published: publicado, reason: motivo });
}
