/**
 * EXPORTAR EL CATÁLOGO DE LOCAL (valentia-dev) A data/catalogo/
 * Guarda en el proyecto, con sus ids, todo lo que ve el cliente: componentes, kits (con sus piezas),
 * cursos, lecciones y ejercicios. NO exporta usuarios, pedidos, códigos ni progreso.
 * Después, al publicar, "npm run seed:prod" lo carga en producción (ver DESPLIEGUE.md).
 *
 * Fotos: las subidas desde el panel (/subidas/…, fuera de git) se copian a public/images/catalogo/
 * y en el JSON se escribe esa ruta. Las de public/images/ ya van en git.
 *
 * Uso (en tu ordenador, con el .env apuntando a valentia-dev):  npm run catalogo:exportar
 * Solo LEE la base de datos.
 */
import "dotenv/config";
import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";
import {
  COLECCIONES_CATALOGO,
  PREFIJO_SUBIDAS,
  nombreDoc,
  revisarCatalogo,
  rutaImagenExportada,
  type Catalogo,
  type Doc,
} from "../src/lib/catalogoProduccion";
import { CARPETA_CATALOGO, escribirCatalogo } from "./catalogo-archivos";

/** El catálogo se exporta solo desde el clúster de desarrollo */
const ORIGEN = "valentia-dev";

const existe = (ruta: string) =>
  stat(ruta).then(
    () => true,
    () => false,
  );

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/.exec(url)?.[1] ?? "";
  if (!host.includes(ORIGEN)) {
    throw new Error(
      `DATABASE_URL (.env) tiene que ser el clúster ${ORIGEN}; ahora es "${host || "?"}".`,
    );
  }

  const cliente = new MongoClient(url, { serverSelectionTimeoutMS: 15_000 });
  try {
    const db = cliente.db();
    console.log(`Exportando el catálogo de ${host} / ${db.databaseName}…`);
    const catalogo = {} as Catalogo;
    for (const coleccion of COLECCIONES_CATALOGO) {
      // promoteValues: false conserva el tipo exacto de los números (entero o decimal)
      catalogo[coleccion] = (await db
        .collection(coleccion)
        .find({}, { promoteValues: false })
        .toArray()) as Doc[];
    }

    // Fotos: subidas → public/images/catalogo/; las demás tienen que existir en public/
    const carpetaSubidas = path.resolve(process.env.ALMACEN_LOCAL_CARPETA ?? "subidas");
    // Fotos guardadas con el almacén privado en local (ver src/lib/almacenamiento/publicoEnPrivado.ts)
    const carpetaPublicas = path.resolve(
      process.env.ALMACEN_PRIVADO_CARPETA ?? "archivos-privados",
      "publicas",
    );
    const avisos: string[] = [];
    let copiadas = 0;
    for (const doc of [...catalogo.Componente, ...catalogo.Kit]) {
      const ruta = doc.imagen;
      if (typeof ruta !== "string" || /^https?:\/\//.test(ruta)) continue;
      const nueva = rutaImagenExportada(ruta);
      if (ruta.startsWith(PREFIJO_SUBIDAS)) {
        const relativa = ruta.slice(PREFIJO_SUBIDAS.length);
        const enSubidas = path.join(carpetaSubidas, relativa);
        const desde = (await existe(enSubidas)) ? enSubidas : path.join(carpetaPublicas, relativa);
        const hasta = path.join("public", nueva);
        if (await existe(desde)) {
          await mkdir(path.dirname(hasta), { recursive: true });
          await copyFile(desde, hasta);
          copiadas++;
        }
        doc.imagen = nueva;
      }
      if (!(await existe(path.join("public", nueva)))) {
        avisos.push(`${nombreDoc(doc)}: no existe public${nueva}`);
      }
    }

    const errores = revisarCatalogo(catalogo);
    if (errores.length > 0) {
      throw new Error(`El catálogo de ${ORIGEN} tiene problemas:\n  ${errores.join("\n  ")}`);
    }
    await escribirCatalogo(catalogo);

    console.log(`✔ Guardado en ${CARPETA_CATALOGO}/:`);
    for (const coleccion of COLECCIONES_CATALOGO) {
      console.log(`  ${coleccion.padEnd(14)} ${String(catalogo[coleccion].length).padStart(4)}`);
    }
    if (copiadas > 0)
      console.log(`✔ ${copiadas} fotos subidas desde el panel copiadas a public/images/catalogo/`);
    if (avisos.length > 0) {
      console.log(`\n⚠ Fotos que faltan (en la web saldrían rotas):\n  ${avisos.join("\n  ")}`);
    }
    console.log(
      "\nSiguiente paso: commit de data/catalogo/ y public/images/, pull request y unirlo a main.\n" +
        "Al publicarse, Render ejecuta «npm run predeploy:prod», que carga el catálogo (sin borrar nada).",
    );
  } finally {
    await cliente.close();
  }
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
