/**
 * CAMBIAR EL SLUG DE LOS KITS RENOMBRADOS EN LA BASE DE DATOS (src/config/kitsRenombrados.ts)
 * Lo ejecuta el pre-despliegue de Render (scripts/renombrar-kits.ts) ANTES de cargar el catálogo,
 * así la versión nueva de la web arranca con la base de datos ya cambiada.
 * Se puede repetir sin problema: si el kit ya tiene el slug nuevo, no hace nada.
 * Cambia: el slug del kit, su foto si es la de siempre (/images/kits/<slug>.svg), las líneas de
 * pedido (para que un pedido aún sin pagar genere su código al pagarse) y la lista de espera.
 * No usa Prisma (como seed:prod): habla con MongoDB directamente.
 */
import type { Db } from "mongodb";
import { KITS_RENOMBRADOS } from "../config/kitsRenombrados";

export interface ResultadoRenombre {
  viejo: string;
  nuevo: string;
  /** "renombrado" | "ya-estaba" (ya tenía el slug nuevo) | "no-existe" (no hay kit con el viejo) */
  kit: "renombrado" | "ya-estaba" | "no-existe";
  lineasPedido: number;
  listaEspera: number;
}

export async function renombrarKits(
  db: Pick<Db, "collection">,
  renombres: Readonly<Record<string, string>> = KITS_RENOMBRADOS,
): Promise<ResultadoRenombre[]> {
  const resultados: ResultadoRenombre[] = [];
  for (const [viejo, nuevo] of Object.entries(renombres)) {
    const kits = db.collection("Kit");
    let kit: ResultadoRenombre["kit"];
    if (await kits.findOne({ slug: nuevo }, { projection: { _id: 1 } })) {
      kit = "ya-estaba";
    } else {
      const r = await kits.updateOne({ slug: viejo }, { $set: { slug: nuevo } });
      kit = r.modifiedCount > 0 ? "renombrado" : "no-existe";
    }
    // La foto de siempre cambia de nombre con el slug (una subida desde el panel se queda igual)
    await kits.updateOne(
      { slug: nuevo, imagen: `/images/kits/${viejo}.svg` },
      { $set: { imagen: `/images/kits/${nuevo}.svg` } },
    );
    const lineas = await db
      .collection("LineaPedido")
      .updateMany({ tipo: "KIT", slug: viejo }, { $set: { slug: nuevo } });
    const espera = await db
      .collection("ListaEspera")
      .updateMany({ kitSlug: viejo }, { $set: { kitSlug: nuevo } });
    resultados.push({
      viejo,
      nuevo,
      kit,
      lineasPedido: lineas.modifiedCount,
      listaEspera: espera.modifiedCount,
    });
  }
  return resultados;
}
