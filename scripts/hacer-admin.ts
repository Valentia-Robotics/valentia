/**
 * CONVERTIR UN USUARIO EN ADMINISTRADOR
 * La persona tiene que haberse creado antes una cuenta normal en /registro.
 *
 * Uso (desde la carpeta del proyecto):
 *   npm run admin -- tu@email.com            → le da el rol ADMIN
 *   npm run admin -- tu@email.com --quitar   → le devuelve el rol CLIENTE
 *   npm run admin                            → enseña quién es ADMIN ahora
 *
 * El cambio tiene efecto al momento: el panel /admin mira el rol en la base de datos
 * cada vez (y el enlace «Panel de administración» del menú aparece al recargar la página).
 *
 * Los administradores tienen que confirmar con un código cada 7 días (los clientes, cada 30):
 * al dar el rol ADMIN, sus dispositivos de confianza caducan como mucho a los 7 días de crearse.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"; // ← SQLite (para PostgreSQL, ver src/lib/db.ts)
import { PrismaClient } from "../src/generated/prisma/client";
import { DIAS_CONFIANZA } from "../src/lib/verificacion/reglas";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

async function main() {
  const argumentos = process.argv.slice(2);
  const quitar = argumentos.includes("--quitar");
  const email = argumentos
    .find((a) => !a.startsWith("--"))
    ?.trim()
    .toLowerCase();

  if (email) {
    const usuario = await db.usuario.findUnique({ where: { email } });
    if (!usuario) {
      console.error(`✖ No hay ninguna cuenta con el email ${email}.`);
      console.error("  Crea primero la cuenta en /registro y vuelve a ejecutar este comando.");
      process.exitCode = 1;
      return;
    }
    await db.usuario.update({ where: { email }, data: { rol: quitar ? "CLIENTE" : "ADMIN" } });

    // Nuevo ADMIN: su confianza en cada dispositivo dura menos (ver src/lib/verificacion/reglas.ts)
    if (!quitar) {
      const dias = DIAS_CONFIANZA.ADMIN * 24 * 60 * 60_000;
      const dispositivos = await db.dispositivoConfianza.findMany({
        where: { usuarioId: usuario.id },
      });
      for (const d of dispositivos) {
        const maximo = new Date(d.creadoEn.getTime() + dias);
        if (d.caducaEn > maximo) {
          await db.dispositivoConfianza.update({ where: { id: d.id }, data: { caducaEn: maximo } });
        }
      }
    }
    console.log(
      quitar
        ? `✔ ${usuario.nombre} (${email}) ya no es administrador.`
        : `✔ ${usuario.nombre} (${email}) ahora es administrador. Entra en /admin.`,
    );
  }

  const admins = await db.usuario.findMany({
    where: { rol: "ADMIN" },
    select: { nombre: true, email: true },
    orderBy: { email: "asc" },
  });
  console.log(
    admins.length === 0
      ? "Ahora mismo no hay ningún administrador. Uso: npm run admin -- tu@email.com"
      : `Administradores: ${admins.map((a) => `${a.nombre} <${a.email}>`).join(", ")}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("✖ No se pudo cambiar el rol.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
