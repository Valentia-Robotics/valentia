/**
 * RESEÑAS DE LOS KITS (consultas a la base de datos)
 * Reglas en src/config/resenas.ts. Solo cuentan y se ven las PUBLICADAS.
 */
import "server-only";
import { configResenas } from "@/config/resenas";
import { db } from "@/lib/db";
import { mediaEstrellas, nombrePublico } from "./formato";

export interface ResenaPublica {
  id: string;
  autor: string;
  estrellas: number;
  texto: string;
  fecha: Date;
}

export interface ResumenResenas {
  media: number;
  total: number;
  /** Las más recientes (como mucho configResenas.enLaFicha) */
  resenas: ResenaPublica[];
}

/** Media, número y lista de reseñas publicadas de un kit */
export async function resenasDelKit(kitId: string): Promise<ResumenResenas> {
  const [estrellas, recientes] = await Promise.all([
    db.resena.findMany({ where: { kitId, estado: "PUBLICADA" }, select: { estrellas: true } }),
    db.resena.findMany({
      where: { kitId, estado: "PUBLICADA" },
      orderBy: { actualizadoEn: "desc" },
      take: configResenas.enLaFicha,
      select: {
        id: true,
        estrellas: true,
        texto: true,
        actualizadoEn: true,
        usuario: { select: { nombre: true } },
      },
    }),
  ]);
  return {
    media: mediaEstrellas(estrellas.map((r) => r.estrellas)),
    total: estrellas.length,
    resenas: recientes.map((r) => ({
      id: r.id,
      autor: nombrePublico(r.usuario.nombre),
      estrellas: r.estrellas,
      texto: r.texto,
      fecha: r.actualizadoEn,
    })),
  };
}

/** ¿Puede este usuario opinar sobre el kit? (con soloClientes: si ha activado un código de ese kit) */
export async function puedeOpinar(usuarioId: string, kitId: string): Promise<boolean> {
  if (!configResenas.soloClientes) return true;
  const codigo = await db.codigoActivacion.findFirst({
    where: { kitId, usuarioId, usadoEn: { not: null } },
    select: { id: true },
  });
  return codigo !== null;
}
