/**
 * DATOS DE PRUEBA (SOLO DESARROLLO)
 * Carga el catálogo inicial si no hay ninguno (prisma/catalogo.ts) y añade los datos de prueba:
 * un usuario con el email ya verificado y unos códigos de activación fijos.
 *
 * NUNCA en producción: se niega a ejecutarse con NODE_ENV=production, en Render o si la base de
 * datos se llama "...prod...". En producción el catálogo se carga con "npm run db:catalogo".
 *
 * Uso:  npm run db:seed      → catálogo (si no hay) + usuario y códigos de prueba
 *       npm run db:reset     → BORRA TODO (catálogo, pedidos, cuentas) y vuelve a cargarlo
 */
import bcrypt from "bcryptjs";
import { FORMATO_CODIGO } from "../src/lib/codigos";
import { cargarCatalogo, crearClienteScripts } from "./catalogo";

/**
 * Códigos de activación de prueba para probar /activar. Son fijos para poder ponerlos en el README.
 * Cada vez que ejecutas el seed vuelven a quedar sin usar.
 */
const CODIGOS_DE_PRUEBA: Record<string, string[]> = {
  "vr1-starter-kit": ["VAL-PRUE-CAR2", "VAL-PRUE-CAR3"],
  "brazo-robotico": ["VAL-PRUE-BRZ2", "VAL-PRUE-BRZ3"],
  "estacion-meteorologica": ["VAL-PRUE-MET2", "VAL-PRUE-MET3"],
};

/**
 * Usuario de prueba (solo para desarrollo; también está en el README).
 * Empieza sin cursos: actívale uno con un código de prueba para ver "Mis cursos".
 */
const USUARIO_DE_PRUEBA = {
  nombre: "Alex Prueba",
  email: "prueba@valentia.test",
  contrasena: "robots2026",
};

/** Motivo por el que este entorno parece producción (o null si es desarrollo) */
function pareceProduccion(): string | null {
  if (process.env.NODE_ENV === "production") return 'NODE_ENV es "production"';
  if (process.env.RENDER) return "se está ejecutando en Render";
  const baseDeDatos = (process.env.DATABASE_URL ?? "").match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/)?.[1];
  if (baseDeDatos && /prod/i.test(baseDeDatos)) return `la base de datos se llama "${baseDeDatos}"`;
  return null;
}

async function main() {
  const motivo = pareceProduccion();
  if (motivo) {
    console.error(`✖ El seed de desarrollo no se ejecuta en producción (${motivo}).`);
    console.error("  Para cargar solo el catálogo: npm run db:catalogo");
    process.exitCode = 1;
    return;
  }

  const db = crearClienteScripts();
  try {
    await cargarCatalogo(db);

    // Códigos de prueba: se crean si faltan y, si ya existen, vuelven a quedar sin usar
    for (const [slug, codigos] of Object.entries(CODIGOS_DE_PRUEBA)) {
      const kit = await db.kit.findUnique({ where: { slug }, select: { id: true } });
      if (!kit) continue; // el kit se ha borrado desde el panel
      for (const codigo of codigos) {
        if (!FORMATO_CODIGO.test(codigo)) {
          throw new Error(`El código de prueba "${codigo}" no tiene un formato válido`);
        }
        await db.codigoActivacion.upsert({
          where: { codigo },
          create: { codigo, kitId: kit.id },
          update: { usadoEn: null, usuarioId: null, desactivadoEn: null },
        });
      }
    }

    // Kits de prueba en el almacén: sin unidades no se pueden comprar (cada venta resta una).
    // Solo a los que tienen 0, para no pisar lo que se haya puesto a mano en /stock.
    await db.kit.updateMany({ where: { stock: 0, precioCentimos: { gt: 0 } }, data: { stock: 20 } });

    // Usuario de prueba: si ya existe, solo se le vuelve a poner la contraseña de prueba.
    // Su email ya está verificado (no hace falta código para confirmarlo).
    const contrasenaHash = await bcrypt.hash(USUARIO_DE_PRUEBA.contrasena, 10);
    const emailVerificadoEn = new Date();
    await db.usuario.upsert({
      where: { email: USUARIO_DE_PRUEBA.email },
      create: {
        nombre: USUARIO_DE_PRUEBA.nombre,
        email: USUARIO_DE_PRUEBA.email,
        contrasenaHash,
        emailVerificadoEn,
      },
      update: { contrasenaHash, emailVerificadoEn },
    });

    console.log(`✔ Usuario de prueba: ${USUARIO_DE_PRUEBA.email} / ${USUARIO_DE_PRUEBA.contrasena}`);
    console.log(
      `✔ Códigos de activación de prueba (sin usar): ${Object.values(CODIGOS_DE_PRUEBA).flat().join(", ")}`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("✖ No se pudieron cargar los datos de prueba.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
