/**
 * PASAR LAS FOTOS DEL PANEL A LA NUBE (se usa una vez, al publicar la web)
 * 1. Sube cada archivo de la carpeta subidas/ al almacén en la nube (misma ruta).
 * 2. Cambia en la base de datos las direcciones /subidas/… por las de la nube.
 *
 * Antes, rellena en .env las variables ALMACEN_* (ver src/lib/almacenamiento/nube.ts).
 * Uso:  npm run fotos:nube            (prueba: solo dice lo que haría)
 *       npm run fotos:nube -- --hacer  (lo hace de verdad)
 * Se puede repetir sin problema: lo ya subido se vuelve a subir igual.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { crearAdaptador } from "../src/lib/adaptadorBD";
import { PrismaClient } from "../src/generated/prisma/client";

const hacer = process.argv.includes("--hacer");
const CARPETA = path.resolve(process.env.ALMACEN_LOCAL_CARPETA ?? "subidas");

function variable(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta ${nombre} en .env`);
  return valor.replace(/\/$/, "");
}

async function archivos(carpeta: string): Promise<string[]> {
  const entradas = await readdir(carpeta, { withFileTypes: true }).catch(() => []);
  const lista: string[] = [];
  for (const e of entradas) {
    const completa = path.join(carpeta, e.name);
    if (e.isDirectory()) lista.push(...(await archivos(completa)));
    else if (e.name.endsWith(".webp")) lista.push(completa);
  }
  return lista;
}

async function main() {
  const endpoint = variable("ALMACEN_ENDPOINT");
  const bucket = variable("ALMACEN_BUCKET");
  const urlPublica = variable("ALMACEN_URL_PUBLICA");
  const cliente = new AwsClient({
    accessKeyId: variable("ALMACEN_CLAVE_ID"),
    secretAccessKey: variable("ALMACEN_CLAVE_SECRETA"),
    service: "s3",
    region: process.env.ALMACEN_REGION?.trim() || "auto",
  });

  const lista = await archivos(CARPETA);
  console.log(`${lista.length} fotos en ${CARPETA}${hacer ? "" : " (prueba: no se sube nada)"}`);
  for (const archivo of lista) {
    const ruta = path.relative(CARPETA, archivo).split(path.sep).join("/");
    console.log(`  /subidas/${ruta} → ${urlPublica}/${ruta}`);
    if (!hacer) continue;
    const url = `${endpoint}/${encodeURIComponent(bucket)}/${ruta.split("/").map(encodeURIComponent).join("/")}`;
    const respuesta = await cliente.fetch(url, {
      method: "PUT",
      body: new Uint8Array(await readFile(archivo)),
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status} al subir ${ruta}`);
  }

  // Direcciones guardadas en la base de datos
  const db = new PrismaClient({ adapter: crearAdaptador() });
  try {
    const cambiar = (imagen: string) => imagen.replace(/^\/subidas\//, `${urlPublica}/`);
    const [componentes, kits] = await Promise.all([
      db.componente.findMany({ where: { imagen: { startsWith: "/subidas/" } } }),
      db.kit.findMany({ where: { imagen: { startsWith: "/subidas/" } } }),
    ]);
    console.log(`${componentes.length} componentes y ${kits.length} kits con fotos locales`);
    if (hacer) {
      for (const c of componentes) {
        await db.componente.update({ where: { id: c.id }, data: { imagen: cambiar(c.imagen) } });
      }
      for (const k of kits) {
        await db.kit.update({ where: { id: k.id }, data: { imagen: cambiar(k.imagen) } });
      }
      console.log('✔ Hecho. Pon ALMACEN_PROVEEDOR="nube" en .env si no lo habías hecho.');
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("✖", error instanceof Error ? error.message : error);
  process.exit(1);
});
