/**
 * PRE-DESPLIEGUE EN RENDER («Pre-Deploy Command»: npm run predeploy:prod)
 * Render lo ejecuta después de compilar y antes de arrancar la versión nueva:
 *   1. prisma db push: crea las colecciones y los índices nuevos del esquema. SIN --accept-data-loss:
 *      si un cambio pudiera borrar datos, se para con un mensaje claro y la web sigue con la versión anterior.
 *   2. renombrar-kits: cambia el slug de los kits renombrados (src/config/kitsRenombrados.ts).
 *   3. seed:prod: crea lo que falte del catálogo de data/catalogo/ (nunca modifica ni borra lo que existe).
 *   4. fotos-perdidas: quita de las cuentas las fotos de perfil que se perdieron con el disco (si falla, sigue).
 * Si algo falla, el despliegue se cancela y no se publica la versión nueva.
 */
import { spawnSync } from "node:child_process";

/** Quita la contraseña de cualquier dirección mongodb:// que salga en un mensaje */
const sinSecretos = (texto: string) =>
  texto.replace(/(mongodb(?:\+srv)?:\/\/[^:@/\s]*)(?::[^@\s]*)?@/gi, "$1:***@");

function ejecutar(titulo: string, comando: string): { ok: boolean; salida: string } {
  console.log(`\n▶ ${titulo}: ${comando}`);
  const resultado = spawnSync(comando, { shell: true, encoding: "utf8", env: process.env });
  const salida = sinSecretos(`${resultado.stdout ?? ""}${resultado.stderr ?? ""}`);
  process.stdout.write(salida);
  return { ok: resultado.status === 0, salida };
}

function main() {
  if (!process.env.DATABASE_URL) {
    console.error("✖ Falta la variable DATABASE_URL (en Render: pestaña Environment).");
    process.exit(1);
  }

  const esquema = ejecutar("1/4 Esquema de la base de datos", "npx prisma db push --skip-generate");
  if (!esquema.ok) {
    if (/data loss|accept-data-loss|perder|loss of data/i.test(esquema.salida)) {
      console.error(
        "\n✖ El cambio del esquema BORRARÍA DATOS en producción, así que no se ha aplicado.\n" +
          "  La web sigue con la versión anterior. Haz una copia de seguridad (npm run db:copia) y revisa\n" +
          "  el cambio de prisma/schema.prisma antes de seguir (ver DESPLIEGUE.md).",
      );
    } else {
      console.error(
        "\n✖ No se ha podido aplicar el esquema. Mira el mensaje de arriba (¿Network Access de Atlas?\n" +
          "  ¿DATABASE_URL correcta?). En la Shell de Render, «npm run db:check» explica el motivo.",
      );
    }
    process.exit(1);
  }

  const renombres = ejecutar("2/4 Kits renombrados", "npx tsx scripts/renombrar-kits.ts");
  if (!renombres.ok) {
    console.error(
      "\n✖ No se ha podido cambiar el slug de los kits renombrados (ver el mensaje de arriba). No se publica esta versión.",
    );
    process.exit(1);
  }

  const catalogo = ejecutar("3/4 Catálogo", "npx tsx scripts/seed-prod.ts");
  if (!catalogo.ok) {
    console.error(
      "\n✖ No se ha podido cargar el catálogo (ver el mensaje de arriba). No se publica esta versión.",
    );
    process.exit(1);
  }
  // No es imprescindible: si falla, se avisa y la versión nueva se publica igual
  const fotos = ejecutar("4/4 Fotos de perfil perdidas", "npx tsx scripts/fotos-perdidas.ts");
  if (!fotos.ok) console.warn("\n⚠ No se han podido revisar las fotos de perfil (se sigue igual).");
  console.log("\n✔ Pre-despliegue terminado.");
}

main();
