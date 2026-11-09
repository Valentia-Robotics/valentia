/**
 * GUIONES AUTOMÁTICOS: la entrada de n8n (POST /api/guiones/automaticos y GET …/ping).
 * Trabaja con Request y Response normales: la usan la ruta de la web y backend/ por igual.
 *
 * El guion se guarda con el mismo modelo que los manuales, en «Pendiente de aprobación» y sin editor:
 * el admin lo revisa, lo corrige si hace falta, lo aprueba y lo asigna (o lo descarta).
 * Los campos de siempre se rellenan con lo que trae la IA (la tabla de escenas se guarda aparte).
 */
import "server-only";
import { slugKitActual } from "@/config/kitsRenombrados";
import { Prisma } from "@/generated/prisma/client";
import { comprobarClaveApi } from "@/lib/claveApi";
import { categoriasGuion, crearGuion } from "@/lib/contenido/guiones";
import { leerCuerpo } from "@/lib/cuerpoLimitado";
import { db } from "@/lib/db";
import { registrarIntento } from "@/lib/limite";
import { erroresDeZod } from "@/lib/admin/formularios";
import { esquemaGuion } from "@/lib/validaciones/guion";
import {
  esquemaGuionAutomatico,
  normalizarUrl,
  type GuionAutomatico,
} from "@/lib/validaciones/guionAutomatico";

/** 200 KB: un guion es texto, sobra */
export const TAMANO_MAXIMO = 200 * 1024;

/** Sin fecha límite, el guion tiene una semana (el admin la cambia al revisarlo) */
const DIAS_POR_DEFECTO = 7;

/** Hasta este largo es un vídeo corto (TikTok, Reels, Shorts) */
const SEGUNDOS_VIDEO_CORTO = 180;

/** Categoría si n8n no dice ninguna */
const CATEGORIA_POR_DEFECTO = "Robótica";

const respuesta = (status: number, cuerpo: Record<string, unknown>) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

const sinTildes = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

/** La clave de n8n para guiones: x-api-key = N8N_API_KEY (src/lib/claveApi.ts) */
export function comprobarClave(peticion: Request): Response | null {
  return comprobarClaveApi(peticion, "N8N_API_KEY");
}

/** GET /api/guiones/automaticos/ping: para comprobar la clave desde n8n sin crear nada */
export function ping(peticion: Request): Response {
  return comprobarClave(peticion) ?? respuesta(200, { ok: true });
}

/** POST /api/guiones/automaticos */
export async function crearDesdeN8n(peticion: Request): Promise<Response> {
  const rechazo = comprobarClave(peticion);
  if (rechazo) return rechazo;

  // Si el flujo entra en bucle, no llena el panel (30 por hora: LIMITES.guionApi)
  if (!(await registrarIntento("guionApi", "n8n"))) {
    return respuesta(429, { error: "Demasiadas peticiones. Prueba dentro de una hora." });
  }

  const texto = await leerCuerpo(peticion, TAMANO_MAXIMO);
  if (texto === null) return respuesta(413, { error: "El guion ocupa más de 200 KB." });
  let entrada: unknown;
  try {
    entrada = JSON.parse(texto);
  } catch {
    return respuesta(400, { error: "El cuerpo no es JSON válido." });
  }

  const resultado = await recibir(entrada);
  switch (resultado.estado) {
    case "creado":
      return respuesta(201, { id: resultado.id });
    case "repetido":
      return respuesta(409, { error: "Ya hay un guion de esta noticia.", id: resultado.id });
    case "invalido":
      return respuesta(400, {
        error: `El guion no es válido: ${Object.values(resultado.errores)[0]}`,
        errores: resultado.errores,
      });
  }
}

type Resultado =
  | { estado: "creado"; id: string }
  | { estado: "repetido"; id: string }
  | { estado: "invalido"; errores: Record<string, string> };

async function recibir(entrada: unknown): Promise<Resultado> {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) {
    return { estado: "invalido", errores: { _: "El cuerpo tiene que ser un objeto JSON." } };
  }
  const leido = esquemaGuionAutomatico.safeParse(entrada);
  if (!leido.success) return { estado: "invalido", errores: erroresDeZod(leido.error) };
  const g = leido.data;

  const url = normalizarUrl(g.fuente.url);
  const usada = await db.noticiaUsada.findUnique({ where: { url }, select: { guionId: true } });
  if (usada) return { estado: "repetido", id: usada.guionId };

  // Categoría por nombre (sin importar tildes ni mayúsculas) y kit por su slug: n8n no sabe los ids
  const categorias = await categoriasGuion(true);
  const buscada = sinTildes(g.categoria ?? CATEGORIA_POR_DEFECTO);
  const categoria =
    categorias.find((c) => sinTildes(c.nombre) === buscada) ??
    categorias.find((c) => sinTildes(c.nombre) === sinTildes(CATEGORIA_POR_DEFECTO)) ??
    categorias[0];
  if (!categoria)
    return { estado: "invalido", errores: { categoria: "No hay categorías activas." } };
  const kit = g.kit
    ? await db.kit.findUnique({ where: { slug: slugKitActual(g.kit) }, select: { id: true } })
    : null;

  // Los campos de siempre, con las mismas reglas que el formulario del panel
  const datos = esquemaGuion.safeParse(camposDelPanel(g, categoria.id, kit?.id ?? ""));
  if (!datos.success) return { estado: "invalido", errores: erroresDeZod(datos.error) };

  try {
    const { id } = await crearGuion(datos.data, { id: null, nombre: "n8n" }, "IA", {
      estado: "PENDIENTE_APROBACION",
      automatico: datosAutomaticos(g),
      urlNoticia: url,
    });
    return { estado: "creado", id };
  } catch (error) {
    // Dos llamadas a la vez con la misma noticia: el índice único deja pasar solo una
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const otra = await db.noticiaUsada.findUnique({ where: { url }, select: { guionId: true } });
      if (otra) return { estado: "repetido", id: otra.guionId };
    }
    throw error;
  }
}

const recortar = (valor: string, maximo: number) =>
  valor.length > maximo ? `${valor.slice(0, maximo - 1)}…` : valor;

/** Lo que pide el formulario del panel, sacado del guion por escenas */
function camposDelPanel(g: GuionAutomatico, categoriaId: string, kitId: string) {
  const escenas = ordenarEscenas(g);
  const segundosEscenas = escenas.reduce((total, e) => total + (e.duracionSegundos ?? 0), 0);
  const duracion = g.duracionSegundos || segundosEscenas;
  return {
    titulo: g.titulo,
    categoriaId,
    plataforma: duracion > SEGUNDOS_VIDEO_CORTO ? "YOUTUBE_LARGO" : "VIDEO_CORTO",
    plataformaOtra: "",
    duracionObjetivo: duracion ? `${duracion} segundos` : "Sin indicar",
    gancho: recortar(g.gancho || escenas[0].voz || escenas[0].visual, 600),
    desarrollo: recortar(
      g.textoCompleto ||
        escenas
          .map((e) => e.voz)
          .filter(Boolean)
          .join("\n\n") ||
        g.titulo,
      10_000,
    ),
    llamadaAccion: g.cierreCta || "Sin indicar",
    notasVisuales: recortar(
      escenas.map((e) => `${e.orden}. ${e.visual || "(sin indicar)"}`).join("\n"),
      5000,
    ),
    kitId,
    fechaLimite: new Date(Date.now() + DIAS_POR_DEFECTO * 86_400_000).toISOString().slice(0, 10),
  };
}

/** Escenas en su orden; si no lo traen, el de la lista */
function ordenarEscenas(g: GuionAutomatico) {
  return g.escenas
    .map((e, i) => ({ ...e, orden: e.orden ?? i + 1 }))
    .sort((a, b) => a.orden - b.orden);
}

function datosAutomaticos(g: GuionAutomatico) {
  let medio = g.fuente.medio;
  if (!medio) medio = new URL(g.fuente.url).hostname.replace(/^www\./, "");
  return {
    escenas: ordenarEscenas(g).map((e) => ({
      orden: e.orden,
      duracionSegundos: e.duracionSegundos ?? null,
      voz: e.voz,
      visual: e.visual,
      textoPantalla: e.textoPantalla ?? null,
    })),
    fuente: {
      url: g.fuente.url,
      titulo: g.fuente.titulo ?? null,
      medio,
      fecha: g.fuente.fecha ?? null,
    },
    relevancia: g.relevancia ?? null,
    datosAVerificar: g.datosAVerificar,
    hashtags: g.hashtags,
    descripcionRedes: g.descripcionRedes ?? null,
    nivel: g.nivel ?? null,
    conexionValentia: g.conexionValentia ?? null,
    modelo: g.modelo ?? null,
    generadoEn: g.generadoEn ?? null,
  };
}
