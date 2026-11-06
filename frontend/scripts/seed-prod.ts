/**
 * CARGAR EL CATÁLOGO EN PRODUCCIÓN (data/catalogo/ → la base de datos de DATABASE_URL)
 * Lo ejecuta Render en cada despliegue («npm run predeploy:prod»). Se puede repetir sin problema:
 *   - SOLO CREA lo que no existe en producción; lo que ya existe NUNCA se modifica (el catálogo de
 *     producción se gestiona desde su panel de administración);
 *   - NUNCA borra nada, ni toca usuarios, pedidos, códigos o progreso
 *     (reglas completas en src/lib/catalogoProduccion.ts).
 *
 * Uso:  npm run seed:prod             (aplica)
 *       npm run seed:prod -- --dry-run (solo enseña lo que haría)
 */
import "dotenv/config";
import { MongoClient, type Db } from "mongodb";
import {
  COLECCIONES_CATALOGO,
  COLECCION_APLICADOS,
  planificarSemilla,
  revisarCatalogo,
  type Aplicado,
  type Catalogo,
  type Doc,
} from "../src/lib/catalogoProduccion";
import { leerCatalogo } from "./catalogo-archivos";

const SOLO_SIMULAR = process.argv.includes("--dry-run");

async function leerProduccion(db: Db): Promise<{ prod: Catalogo; memoria: Aplicado[] }> {
  const prod = {} as Catalogo;
  for (const coleccion of COLECCIONES_CATALOGO) {
    prod[coleccion] = (await db
      .collection(coleccion)
      .find({}, { promoteValues: false })
      .toArray()) as Doc[];
  }
  const memoria = await db.collection<Aplicado>(COLECCION_APLICADOS).find().toArray();
  return { prod, memoria };
}

async function main() {
  const json = await leerCatalogo();
  const errores = revisarCatalogo(json);
  if (errores.length > 0) {
    throw new Error(
      `data/catalogo/ tiene problemas (no se ha escrito nada):\n  ${errores.join("\n  ")}`,
    );
  }

  const url = process.env.DATABASE_URL ?? "";
  if (!/^mongodb(\+srv)?:\/\//.test(url))
    throw new Error("Falta DATABASE_URL (una dirección de MongoDB).");
  const host = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/.exec(url)?.[1] ?? "?";
  const cliente = new MongoClient(url, { serverSelectionTimeoutMS: 20_000 });
  try {
    const db = cliente.db();
    console.log(
      `Catálogo → ${host} / ${db.databaseName}${SOLO_SIMULAR ? " (solo simulación)" : ""}`,
    );
    const { prod, memoria } = await leerProduccion(db);
    const plan = planificarSemilla(json, prod, memoria);

    console.log("\n  Colección        crear  ya existen  omitidos");
    for (const c of COLECCIONES_CATALOGO) {
      const r = plan.resumen[c];
      console.log(
        `  ${c.padEnd(16)} ${String(r.crear).padStart(5)}  ${String(r.existentes).padStart(10)}  ${String(r.omitidos).padStart(8)}`,
      );
    }
    // Detalle de lo que se crea (la primera carga crea todo: entonces basta con la tabla)
    const nuevas = plan.operaciones.filter((o) => o.tipo === "crear");
    if (nuevas.length <= 30) {
      for (const op of nuevas) {
        console.log(`  + ${op.coleccion} ${String(op.doc.slug ?? op.doc._id)}`);
      }
    }
    if (plan.omitidos.length > 0) {
      console.log(`\n  No se aplican (no es un error):\n    ${plan.omitidos.join("\n    ")}`);
    }
    if (plan.conflictos.length > 0) {
      throw new Error(
        `No se puede cargar el catálogo sin chocar con lo que ya hay (no se ha escrito nada):\n  ${plan.conflictos.join("\n  ")}`,
      );
    }
    if (plan.operaciones.length === 0) {
      console.log("\n✔ No falta nada del catálogo. No hay nada que escribir.");
      return;
    }
    if (SOLO_SIMULAR) {
      console.log("\nSolo simulación (--dry-run): no se ha escrito nada.");
      return;
    }

    // Todo en una transacción: o se aplica entero o nada
    const sesion = cliente.startSession();
    try {
      await sesion.withTransaction(async () => {
        for (const op of plan.operaciones) {
          // Solo inserciones: lo que ya existe nunca se reescribe
          if (op.tipo === "crear") {
            await db.collection<Doc>(op.coleccion).insertOne(op.doc, { session: sesion });
          }
          await db
            .collection<Aplicado & { aplicadoEn: Date }>(COLECCION_APLICADOS)
            .replaceOne(
              { _id: op.aplicado._id },
              { ...op.aplicado, aplicadoEn: new Date() },
              { upsert: true, session: sesion },
            );
        }
      });
    } finally {
      await sesion.endSession();
    }
    const totales = await Promise.all(
      COLECCIONES_CATALOGO.map(async (c) => `${c} ${await db.collection(c).countDocuments()}`),
    );
    console.log(`\n✔ Catálogo cargado. Ahora hay: ${totales.join(", ")}.`);
  } finally {
    await cliente.close();
  }
}

main().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  // Nunca mostrar la contraseña de la base de datos
  console.error(
    `✖ ${mensaje.replace(/(mongodb(?:\+srv)?:\/\/[^:@/\s]*)(?::[^@\s]*)?@/gi, "$1:***@")}`,
  );
  process.exitCode = 1;
});
