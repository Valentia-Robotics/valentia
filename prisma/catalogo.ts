/**
 * CATÁLOGO INICIAL
 * Lee data/componentes.json, data/kits.json y data/cursos.json, comprueba que son correctos y los
 * guarda en la base de datos. Lo usan el seed de desarrollo (prisma/seed.ts) y la carga del
 * catálogo en producción (scripts/cargar-catalogo.ts). No crea cuentas ni códigos.
 *
 * La base de datos es la fuente de verdad: el catálogo se cambia desde el panel /admin.
 * Por eso SOLO carga los datos si no hay catálogo; si ya hay, no toca nada (así nunca se pierden
 * los cambios hechos en el panel).
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { extensionNulos } from "../src/lib/nulos";
import { esquemaComponente, esquemaCurso, esquemaKit } from "../src/lib/validaciones/catalogo";

// Mensajes de error de validación en español
z.config(z.locales.es());

/** Cliente de Prisma para los scripts (con los campos opcionales guardados como null, ver src/lib/nulos.ts) */
export function crearClienteScripts() {
  return new PrismaClient().$extends(extensionNulos);
}
export type ClienteScripts = ReturnType<typeof crearClienteScripts>;

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

/**
 * Carga el catálogo si la base de datos no tiene ninguno.
 * Devuelve true si lo ha cargado y false si ya había catálogo (no se ha tocado nada).
 */
export async function cargarCatalogo(db: ClienteScripts): Promise<boolean> {
  const componentes = await leerDatos("componentes.json", z.array(esquemaComponente));
  const cursos = await leerDatos("cursos.json", z.array(esquemaCurso));
  const kits = await leerDatos("kits.json", z.array(esquemaKit));

  // Comprobaciones entre archivos: que los kits apunten a cosas que existen
  const slugsComponentes = new Set(componentes.map((c) => c.slug));
  const slugsCursos = new Set(cursos.map((c) => c.slug));
  for (const kit of kits) {
    if (!slugsCursos.has(kit.curso)) {
      throw new Error(`El kit "${kit.slug}" usa el curso "${kit.curso}", que no existe en cursos.json`);
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

  // Si ya hay catálogo, no tocamos nada: puede tener cambios hechos desde el panel
  const [hayComponentes, hayKits, hayCursos] = await Promise.all([
    db.componente.count(),
    db.kit.count(),
    db.curso.count(),
  ]);
  if (hayComponentes + hayKits + hayCursos > 0) {
    console.log("✔ La base de datos ya tiene catálogo: no se ha cambiado nada.");
    console.log("  Los productos y cursos se gestionan desde el panel /admin.");
    return false;
  }

  // Base de datos vacía: creamos el catálogo inicial (todo o nada, en una transacción).
  // timeout amplio: son muchas operaciones seguidas y Atlas está en Internet.
  await db.$transaction(
    async (tx) => {
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
                // Creación anidada: los campos opcionales se rellenan aquí a mano (ver src/lib/nulos.ts)
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
                          solucion: null,
                        }
                      : {
                          orden: j + 1,
                          tipo: "RETO" as const,
                          enunciado: ejercicio.enunciado,
                          pistas: ejercicio.pistas,
                          solucion: ejercicio.solucion,
                          correcta: null,
                          explicacion: null,
                        },
                  ),
                },
              })),
            },
          },
        });
      }

      for (const { precio, curso, componentes: piezas, ...kit } of kits) {
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
          },
        });
      }
    },
    { maxWait: 20_000, timeout: 120_000 },
  );

  const lecciones = cursos.reduce((total, c) => total + c.lecciones.length, 0);
  console.log(
    `✔ Catálogo cargado: ${componentes.length} componentes, ${kits.length} kits, ` +
      `${cursos.length} cursos y ${lecciones} lecciones.`,
  );
  return true;
}
