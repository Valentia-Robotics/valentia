/**
 * DATOS DE PRUEBA
 * Lee data/componentes.json, data/kits.json y data/cursos.json, comprueba
 * que son correctos y los guarda en la base de datos.
 *
 * Uso:  npm run db:seed
 * Se puede ejecutar todas las veces que quieras: borra el catálogo (y los pedidos de prueba) y lo vuelve a crear.
 * Las cuentas de usuario se conservan, pero pierden sus cursos y su progreso (dependen del catálogo).
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"; // ← SQLite (para PostgreSQL, ver src/lib/db.ts)
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { FORMATO_CODIGO } from "../src/lib/codigos";
import { esquemaComponente, esquemaCurso, esquemaKit } from "../src/lib/validaciones/catalogo";

/**
 * Códigos de activación de prueba (sin usar) para probar /activar en la fase 5.
 * Son fijos para poder ponerlos en el README. Cada vez que ejecutas el seed vuelven a quedar sin usar.
 */
const CODIGOS_DE_PRUEBA: Record<string, string[]> = {
  "coche-seguidor-de-lineas": ["VAL-PRUE-CAR2", "VAL-PRUE-CAR3"],
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

// Mensajes de error de validación en español
z.config(z.locales.es());

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

/** Lee un JSON de la carpeta data/ y lo valida. Si hay errores, explica cuáles. */
async function leerDatos<T extends z.ZodType>(archivo: string, esquema: T): Promise<z.infer<T>> {
  const ruta = path.join(process.cwd(), "data", archivo);
  const contenido: unknown = JSON.parse(await readFile(ruta, "utf8"));
  const resultado = esquema.safeParse(contenido);
  if (!resultado.success) {
    throw new Error(`Hay errores en data/${archivo}:\n${z.prettifyError(resultado.error)}`);
  }
  return resultado.data;
}

/** Convierte euros (24.9) en céntimos (2490) */
const aCentimos = (euros: number) => Math.round(euros * 100);

async function main() {
  const componentes = await leerDatos("componentes.json", z.array(esquemaComponente));
  const cursos = await leerDatos("cursos.json", z.array(esquemaCurso));
  const kits = await leerDatos("kits.json", z.array(esquemaKit));

  // Comprobaciones entre archivos: que los kits apunten a cosas que existen
  const slugsComponentes = new Set(componentes.map((c) => c.slug));
  const slugsCursos = new Set(cursos.map((c) => c.slug));
  for (const kit of kits) {
    if (!slugsCursos.has(kit.curso)) {
      throw new Error(
        `El kit "${kit.slug}" usa el curso "${kit.curso}", que no existe en cursos.json`,
      );
    }
    for (const { slug } of kit.componentes) {
      if (!slugsComponentes.has(slug)) {
        throw new Error(
          `El kit "${kit.slug}" usa el componente "${slug}", que no existe en componentes.json`,
        );
      }
    }
  }
  for (const curso of cursos) {
    for (const leccion of curso.lecciones) {
      for (const ejercicio of leccion.ejercicios) {
        if (ejercicio.tipo === "TEST" && ejercicio.correcta >= ejercicio.opciones.length) {
          throw new Error(`En "${curso.slug} › ${leccion.slug}" la respuesta correcta no existe`);
        }
      }
    }
  }

  // Borramos el catálogo anterior (en orden, por las relaciones) y lo creamos de nuevo
  await db.$transaction(async (tx) => {
    // Los códigos dependen de los kits, así que la tienda vuelve a quedar "como nueva":
    // se borran también los pedidos de prueba que hayas hecho y sus códigos.
    await tx.codigoActivacion.deleteMany();
    await tx.pedido.deleteMany();
    await tx.kitComponente.deleteMany();
    await tx.kit.deleteMany();
    await tx.componente.deleteMany();
    await tx.ejercicio.deleteMany();
    await tx.leccion.deleteMany();
    await tx.curso.deleteMany();

    for (const { precio, ...componente } of componentes) {
      await tx.componente.create({
        data: { ...componente, precioCentimos: aCentimos(precio) },
      });
    }

    for (const curso of cursos) {
      await tx.curso.create({
        data: {
          slug: curso.slug,
          titulo: curso.titulo,
          descripcion: curso.descripcion,
          nivel: curso.nivel,
          lecciones: {
            create: curso.lecciones.map((leccion, i) => ({
              slug: leccion.slug,
              orden: i + 1,
              titulo: leccion.titulo,
              descripcion: leccion.descripcion,
              videoUrl: leccion.videoUrl,
              duracionMin: leccion.duracionMin,
              ejercicios: {
                create: leccion.ejercicios.map((ejercicio, j) =>
                  ejercicio.tipo === "TEST"
                    ? {
                        orden: j + 1,
                        tipo: "TEST" as const,
                        enunciado: ejercicio.enunciado,
                        opciones: ejercicio.opciones,
                        correcta: ejercicio.correcta,
                        explicacion: ejercicio.explicacion,
                      }
                    : {
                        orden: j + 1,
                        tipo: "RETO" as const,
                        enunciado: ejercicio.enunciado,
                        pistas: ejercicio.pistas,
                        solucion: ejercicio.solucion,
                      },
                ),
              },
            })),
          },
        },
      });
    }

    for (const { precio, curso, componentes: piezas, ...kit } of kits) {
      const codigos = CODIGOS_DE_PRUEBA[kit.slug] ?? [];
      for (const codigo of codigos) {
        if (!FORMATO_CODIGO.test(codigo)) {
          throw new Error(`El código de prueba "${codigo}" no tiene un formato válido`);
        }
      }
      await tx.kit.create({
        data: {
          ...kit,
          precioCentimos: aCentimos(precio),
          curso: { connect: { slug: curso } },
          componentes: {
            create: piezas.map(({ slug, cantidad }) => ({
              cantidad,
              componente: { connect: { slug } },
            })),
          },
          codigos: { create: codigos.map((codigo) => ({ codigo })) },
        },
      });
    }
  });

  // Usuario de prueba: si ya existe, solo se le vuelve a poner la contraseña de prueba
  const contrasenaHash = await bcrypt.hash(USUARIO_DE_PRUEBA.contrasena, 10);
  await db.usuario.upsert({
    where: { email: USUARIO_DE_PRUEBA.email },
    create: { nombre: USUARIO_DE_PRUEBA.nombre, email: USUARIO_DE_PRUEBA.email, contrasenaHash },
    update: { contrasenaHash },
  });

  const lecciones = cursos.reduce((total, c) => total + c.lecciones.length, 0);
  console.log(`✔ Usuario de prueba: ${USUARIO_DE_PRUEBA.email} / ${USUARIO_DE_PRUEBA.contrasena}`);
  console.log(
    `✔ Datos cargados: ${componentes.length} componentes, ${kits.length} kits, ` +
      `${cursos.length} cursos y ${lecciones} lecciones.`,
  );
  console.log(
    `✔ Códigos de activación de prueba (sin usar): ${Object.values(CODIGOS_DE_PRUEBA).flat().join(", ")}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("✖ No se pudieron cargar los datos de prueba.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
