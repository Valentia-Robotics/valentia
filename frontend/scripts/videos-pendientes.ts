/**
 * PONE LOS VÍDEOS QUE FALTABAN EN PRODUCCIÓN
 * seed:prod nunca modifica lo que ya existe, así que una lección creada con el vídeo «PENDIENTE» se
 * quedaba así aunque data/ ya tuviera su enlace. Este paso copia el enlace de data/cursos.json SOLO a
 * las lecciones que siguen en «PENDIENTE» (o vacías): si alguien ya puso un vídeo desde el panel
 * (/admin/cursos), no se toca. Se puede repetir.
 *
 * Lo ejecuta el pre-despliegue de Render (también: npx tsx scripts/videos-pendientes.ts).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

type CursoJson = { slug: string; lecciones: { slug: string; videoUrl: string }[] };

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/^mongodb(\+srv)?:\/\//.test(url))
    throw new Error("Falta DATABASE_URL (una dirección de MongoDB).");
  const cursos = JSON.parse(
    readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), "data/cursos.json"), "utf8"),
  ) as CursoJson[];

  const cliente = new MongoClient(url, { serverSelectionTimeoutMS: 20_000 });
  try {
    const bd = cliente.db();
    let puestos = 0;
    for (const curso of cursos) {
      const conVideo = curso.lecciones.filter((l) => l.videoUrl && l.videoUrl !== "PENDIENTE");
      if (conVideo.length === 0) continue;
      const fila = await bd
        .collection("Curso")
        .findOne({ slug: curso.slug }, { projection: { _id: 1 } });
      if (!fila) continue;
      for (const leccion of conVideo) {
        const { modifiedCount } = await bd
          .collection("Leccion")
          .updateOne(
            { cursoId: fila._id, slug: leccion.slug, videoUrl: { $in: ["PENDIENTE", ""] } },
            { $set: { videoUrl: leccion.videoUrl } },
          );
        if (modifiedCount) console.log(`  Vídeo puesto: ${curso.slug} / ${leccion.slug}`);
        puestos += modifiedCount;
      }
    }
    console.log(`  Vídeos pendientes puestos: ${puestos}`);
  } finally {
    await cliente.close();
  }
}

main().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(
    `✖ ${mensaje.replace(/(mongodb(?:\+srv)?:\/\/[^:@/\s]*)(?::[^@\s]*)?@/gi, "$1:***@")}`,
  );
  process.exit(1);
});
