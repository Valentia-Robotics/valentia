/**
 * RECIBIR UN GUION DESDE FUERA (n8n y, más adelante, el módulo del servidor)
 * Valida el JSON con las mismas reglas que el panel y lo guarda en borrador con origen IA:
 * nunca llega a un editor sin pasar por la revisión del admin.
 *
 * La categoría llega por su nombre y el kit por su slug: quien escribe el JSON no conoce los ids.
 */
import "server-only";
import { erroresDeZod } from "@/lib/admin/formularios";
import { categoriasGuion, crearGuion } from "@/lib/contenido/guiones";
import { db } from "@/lib/db";
import { esquemaGuion } from "@/lib/validaciones/guion";

export type ResultadoGuion =
  | { estado: "creado"; id: string }
  | { estado: "invalido"; errores: Record<string, string> }
  | { estado: "repetido"; id: string };

const UN_DIA = 24 * 60 * 60_000;

const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

export async function recibirGuion(entrada: unknown, origen: string): Promise<ResultadoGuion> {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) {
    return { estado: "invalido", errores: { _: "El cuerpo tiene que ser un objeto JSON." } };
  }
  const datos = entrada as Record<string, unknown>;

  // La temática siempre es tecnología y robótica: solo valen las categorías de la lista
  const categorias = await categoriasGuion(true);
  const nombre = texto(datos.categoria).trim().toLowerCase();
  const categoria = categorias.find((c) => c.nombre.toLowerCase() === nombre);
  if (!categoria) {
    const validas = categorias.map((c) => c.nombre).join(", ");
    return { estado: "invalido", errores: { categoria: `Tiene que ser una de: ${validas}.` } };
  }

  const slugKit = texto(datos.kit).trim();
  const kit = slugKit
    ? await db.kit.findUnique({ where: { slug: slugKit }, select: { id: true } })
    : null;
  if (slugKit && !kit) return { estado: "invalido", errores: { kit: "No existe ese kit." } };

  const guion = esquemaGuion.safeParse({
    titulo: datos.titulo,
    categoriaId: categoria.id,
    plataforma: datos.plataforma,
    plataformaOtra: texto(datos.plataformaOtra),
    duracionObjetivo: datos.duracionObjetivo,
    gancho: datos.gancho,
    desarrollo: datos.desarrollo,
    llamadaAccion: datos.llamadaAccion,
    notasVisuales: datos.notasVisuales,
    kitId: kit?.id ?? "",
    fechaLimite: datos.fechaLimite,
  });
  if (!guion.success) return { estado: "invalido", errores: erroresDeZod(guion.error) };

  // Si el cron repite la llamada, el mismo guion no se duplica en el panel
  const repetido = await db.guion.findFirst({
    where: {
      titulo: guion.data.titulo,
      origen: "IA",
      creadoEn: { gte: new Date(Date.now() - UN_DIA) },
    },
    select: { id: true },
  });
  if (repetido) return { estado: "repetido", id: repetido.id };

  const { id } = await crearGuion(guion.data, { id: null, nombre: origen }, "IA");
  return { estado: "creado", id };
}
