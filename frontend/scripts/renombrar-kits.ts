/**
 * CAMBIA EN LA BASE DE DATOS EL SLUG DE LOS KITS RENOMBRADOS (src/config/kitsRenombrados.ts)
 * Lo ejecuta el pre-despliegue de Render antes de cargar el catálogo. También sirve en local
 * para la base de datos de desarrollo:  npm run kits:renombrar
 * Se puede repetir: si ya está hecho, no cambia nada.
 */
import "dotenv/config";
import { MongoClient } from "mongodb";
import { renombrarKits } from "../src/lib/renombrarKits";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/^mongodb(\+srv)?:\/\//.test(url))
    throw new Error("Falta DATABASE_URL (una dirección de MongoDB).");
  const cliente = new MongoClient(url, { serverSelectionTimeoutMS: 20_000 });
  try {
    const resultados = await renombrarKits(cliente.db());
    for (const r of resultados) {
      const que = {
        renombrado: "cambiado",
        "ya-estaba": "ya tenía el nuevo",
        "no-existe": "no hay ningún kit con el viejo",
      }[r.kit];
      console.log(
        `  ${r.viejo} → ${r.nuevo}: ${que} · líneas de pedido ${r.lineasPedido} · lista de espera ${r.listaEspera}`,
      );
    }
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
