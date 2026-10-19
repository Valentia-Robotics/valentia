/**
 * COPIAR EL CATÁLOGO DE LOCAL (valentia-dev) A PRODUCCIÓN (valentia-prod)
 * Deja en producción exactamente los mismos componentes, kits, cursos, lecciones y ejercicios que
 * en local, con los mismos ids. NUNCA toca usuarios, pedidos, códigos ni progreso.
 *
 * Uso (desde tu ordenador, con tu IP añadida en Network Access de valentia-prod; ver DESPLIEGUE.md):
 *   npm run catalogo:copiar              simula, enseña el plan y, si confirmas, escribe
 *   npm run catalogo:copiar -- --dry-run solo simula (no escribe nada)
 *
 * Pasos:
 *   1. Origen: DATABASE_URL del .env (su host tiene que contener "valentia-dev").
 *   2. Destino: se pide aquí con la entrada oculta (solo en memoria; nunca se guarda ni se muestra).
 *   3. Fotos: las subidas desde el panel (/subidas/…) se copian a public/images/catalogo/ y tienen que
 *      estar en git y publicadas antes de copiar (si no, se para y te dice qué hacer).
 *   4. Simulación: qué se crea, actualiza, borra o conserva en cada colección.
 *   5. Si confirmas: copia de seguridad de producción en copias/ y escritura en UNA transacción
 *      (si algo falla, producción queda como estaba).
 *   6. Resumen y comprobación final.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { BSON, MongoClient, type Db } from "mongodb";
import {
  COLECCIONES_CATALOGO,
  COLECCIONES_PROTEGIDAS,
  PREFIJO_CATALOGO,
  PREFIJO_SUBIDAS,
  adaptarImagenes,
  idTexto,
  nombreDoc,
  planificarCopia,
  type Catalogo,
  type Doc,
  type Plan,
  type UsoEnProduccion,
} from "../src/lib/copiaCatalogo";

const { EJSON } = BSON;
const SOLO_SIMULAR = process.argv.includes("--dry-run");
const ORIGEN_ESPERADO = "valentia-dev";
const DESTINO_ESPERADO = "valentia-prod";
/** Colecciones de clientes cuyos totales se enseñan antes y después (para ver que no cambian) */
const PROTEGIDAS_RESUMEN = ["Usuario", "Pedido", "CodigoActivacion", "LoteCodigos", "CursoUsuario"];

/** Termina con un mensaje de error claro */
function parar(mensaje: string): never {
  console.error(`\n✘ ${mensaje}`);
  process.exit(1);
}

/** Host de una dirección de MongoDB (lo que va entre la @ y la /), sin usuario ni contraseña */
function hostDe(url: string): string {
  return /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/.exec(url.trim())?.[1]?.toLowerCase() ?? "";
}

/** Pregunta normal (lo que escribes se ve) */
async function preguntar(texto: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(texto)).trim();
  } finally {
    rl.close();
  }
}

/** Pregunta con la entrada oculta: no se ve lo que escribes o pegas. Solo queda en memoria. */
function preguntarOculto(texto: string): Promise<string> {
  if (!process.stdin.isTTY) {
    parar(
      "Ejecuta el script en una terminal (PowerShell o la terminal de VS Code) para escribir la dirección.",
    );
  }
  process.stdout.write(texto);
  return new Promise((resolver) => {
    let valor = "";
    const entrada = process.stdin;
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");
    const alPulsar = (trozo: string) => {
      for (const tecla of trozo) {
        if (tecla === "\u0003") {
          process.stdout.write("\n");
          process.exit(130); // Ctrl+C
        } else if (tecla === "\r" || tecla === "\n") {
          entrada.setRawMode(false);
          entrada.pause();
          entrada.off("data", alPulsar);
          process.stdout.write(`(oculta, ${valor.length} caracteres)\n`);
          resolver(valor.trim());
          return;
        } else if (tecla === "\u007f" || tecla === "\b") {
          valor = valor.slice(0, -1);
        } else if (tecla >= " ") {
          valor += tecla;
        }
      }
    };
    entrada.on("data", alPulsar);
  });
}

/** Conecta y comprueba con un ping; si falla, explica lo más probable */
async function conectar(url: string, nombre: string): Promise<MongoClient> {
  const cliente = new MongoClient(url, { serverSelectionTimeoutMS: 10_000 });
  try {
    await cliente.connect();
    await cliente.db().command({ ping: 1 });
    return cliente;
  } catch (error) {
    const texto = String(error instanceof Error ? error.message : error).toLowerCase();
    const motivo = /bad auth|authentication failed/.test(texto)
      ? "usuario o contraseña incorrectos (Atlas → Database Access)."
      : /internal error|internalerror|alert|timed out|server selection/.test(texto)
        ? "el clúster rechaza la conexión: añade tu IP en Atlas → Network Access de ese proyecto y comprueba que el clúster no está en pausa."
        : /enotfound|querysrv/.test(texto)
          ? "no se encuentra el clúster: revisa el nombre (…mongodb.net) de la dirección."
          : "error al conectar.";
    await cliente.close().catch(() => {});
    parar(`No se puede conectar con ${nombre}: ${motivo}`);
  }
}

async function leerCatalogo(db: Db): Promise<Catalogo> {
  const catalogo = {} as Catalogo;
  for (const nombre of COLECCIONES_CATALOGO) {
    catalogo[nombre] = (await db.collection(nombre).find().toArray()) as Doc[];
  }
  return catalogo;
}

/** Lo que usan del catálogo los datos de clientes de producción */
async function leerUso(db: Db): Promise<UsoEnProduccion> {
  const ids = async (coleccion: string, campo: string) =>
    new Set((await db.collection(coleccion).distinct(campo)).filter((v) => v != null).map(idTexto));
  const slugsEnPedidos = new Set<string>();
  for (const linea of await db
    .collection("LineaPedido")
    .find({}, { projection: { slug: 1, piezas: 1 } })
    .toArray()) {
    if (typeof linea.slug === "string" && linea.slug) slugsEnPedidos.add(linea.slug);
    if (Array.isArray(linea.piezas)) {
      for (const pieza of linea.piezas)
        if (typeof pieza?.slug === "string") slugsEnPedidos.add(pieza.slug);
    }
  }
  const progreso = [
    ...(await ids("ProgresoLeccion", "leccionId")),
    ...(await ids("VideoVisto", "leccionId")),
    ...(await ids("ResultadoTest", "leccionId")),
  ];
  return {
    kitsConCodigos: new Set([
      ...(await ids("CodigoActivacion", "kitId")),
      ...(await ids("LoteCodigos", "kitId")),
    ]),
    cursosConAlumnos: await ids("CursoUsuario", "cursoId"),
    leccionesConProgreso: new Set(progreso),
    ejerciciosConProgreso: await ids("ProgresoEjercicio", "ejercicioId"),
    slugsEnPedidos,
  };
}

/**
 * Fotos: copia las subidas desde el panel a public/images/catalogo/ y comprueba que todas las fotos
 * del catálogo locales (/images/…) existen y están en git. Devuelve la lista de problemas.
 */
async function prepararFotos(origen: Catalogo): Promise<string[]> {
  const carpetaSubidas = path.resolve(process.env.ALMACEN_LOCAL_CARPETA ?? "subidas");
  const enGit = new Set(
    execFileSync("git", ["ls-files", "-z", "public/images"], { encoding: "utf8" })
      .split("\0")
      .filter(Boolean),
  );
  const problemas: string[] = [];
  const copiadas: string[] = [];
  for (const doc of [...origen.Componente, ...origen.Kit]) {
    const ruta = doc.imagen;
    if (typeof ruta !== "string" || /^https?:\/\//.test(ruta)) continue; // fotos en la nube: nada que hacer
    let publica = ruta;
    if (ruta.startsWith(PREFIJO_SUBIDAS)) {
      const relativa = ruta.slice(PREFIJO_SUBIDAS.length);
      publica = PREFIJO_CATALOGO + relativa;
      const desde = path.join(carpetaSubidas, relativa);
      const hasta = path.join("public", publica);
      if (!(await stat(hasta).catch(() => null))) {
        if (!(await stat(desde).catch(() => null))) {
          problemas.push(
            `${nombreDoc(doc)}: no existe la foto ${ruta} en ${path.relative(".", desde)}`,
          );
          continue;
        }
        await mkdir(path.dirname(hasta), { recursive: true });
        await copyFile(desde, hasta);
        copiadas.push(hasta);
      }
    }
    const archivo = path.posix.join("public", publica);
    if (!(await stat(archivo).catch(() => null))) {
      problemas.push(`${nombreDoc(doc)}: no existe ${archivo}`);
    } else if (!enGit.has(archivo)) {
      problemas.push(`${nombreDoc(doc)}: ${archivo} no está en git (haz commit y publica)`);
    }
  }
  if (copiadas.length > 0) {
    console.log(`\nFotos subidas desde el panel copiadas a public${PREFIJO_CATALOGO}:`);
    for (const archivo of copiadas) console.log(`  + ${archivo}`);
  }
  return problemas;
}

function mostrarPlan(plan: Plan): boolean {
  console.log("\nSIMULACIÓN (todavía no se ha escrito nada):\n");
  console.log("  Colección        crear  actualizar  borrar  conservar  sin cambios");
  let hayCambios = false;
  for (const nombre of COLECCIONES_CATALOGO) {
    const p = plan.colecciones[nombre];
    hayCambios ||= p.crear.length + p.actualizar.length + p.borrar.length > 0;
    console.log(
      `  ${nombre.padEnd(16)} ${String(p.crear.length).padStart(5)}  ${String(p.actualizar.length).padStart(10)}  ${String(p.borrar.length).padStart(6)}  ${String(p.conservar.length).padStart(9)}  ${String(p.iguales).padStart(11)}`,
    );
  }
  for (const nombre of COLECCIONES_CATALOGO) {
    const p = plan.colecciones[nombre];
    const lineas = [
      ...p.crear.map((d) => `  + crear      ${nombreDoc(d)}`),
      ...p.actualizar.map((d) => `  ~ actualizar ${nombreDoc(d)}`),
      ...p.borrar.map((d) => `  - borrar     ${nombreDoc(d)}`),
      ...p.conservar.map((c) => `  ! conservar  ${nombreDoc(c.doc)}: ${c.motivo}`),
    ];
    if (lineas.length > 0) console.log(`\n${nombre}:\n${lineas.join("\n")}`);
  }
  const conservados = COLECCIONES_CATALOGO.flatMap((n) => plan.colecciones[n].conservar);
  if (conservados.length > 0) {
    console.log(
      "\n⚠ AVISO: lo marcado con «!» sobra en producción, pero lo usan pedidos, códigos o alumnos." +
        "\n  No se borra. Revisa en el panel si es un dato de prueba.",
    );
  }
  return hayCambios;
}

async function contar(db: Db, colecciones: readonly string[]): Promise<Record<string, number>> {
  const totales: Record<string, number> = {};
  for (const nombre of colecciones) totales[nombre] = await db.collection(nombre).countDocuments();
  return totales;
}

async function main() {
  console.log(
    `Copiar el catálogo de ${ORIGEN_ESPERADO} a ${DESTINO_ESPERADO}${SOLO_SIMULAR ? " (solo simulación)" : ""}\n`,
  );

  // 1. Origen
  const urlOrigen = process.env.DATABASE_URL ?? "";
  const hostOrigen = hostDe(urlOrigen);
  if (!hostOrigen.includes(ORIGEN_ESPERADO)) {
    parar(
      `El origen (DATABASE_URL del .env) tiene que ser el clúster ${ORIGEN_ESPERADO}; ahora es "${hostOrigen || "?"}".`,
    );
  }
  console.log(`Origen:  ${hostOrigen}`);

  // 2. Destino (solo en memoria)
  const urlDestino = await preguntarOculto(
    `Dirección de ${DESTINO_ESPERADO} (Atlas → Connect → Drivers): `,
  );
  const hostDestino = hostDe(urlDestino);
  if (!hostDestino)
    parar("Eso no parece una dirección de MongoDB (tiene que empezar por mongodb+srv://).");
  if (!hostDestino.includes(DESTINO_ESPERADO)) {
    parar(`El destino tiene que ser el clúster ${DESTINO_ESPERADO}; has escrito "${hostDestino}".`);
  }
  console.log(`Destino: ${hostDestino}`);
  if (
    (await preguntar(`Para confirmar el destino, escribe ${DESTINO_ESPERADO}: `)) !==
    DESTINO_ESPERADO
  ) {
    parar("No coincide. No se ha hecho nada.");
  }

  const clienteOrigen = await conectar(urlOrigen, ORIGEN_ESPERADO);
  const clienteDestino = await conectar(urlDestino, DESTINO_ESPERADO);
  try {
    const dbOrigen = clienteOrigen.db();
    const dbDestino = clienteDestino.db();
    if (dbDestino.databaseName === "test") {
      parar(
        "La dirección de destino no indica la base de datos: pon /valentia justo antes del «?».",
      );
    }
    console.log(`Bases de datos: ${dbOrigen.databaseName} → ${dbDestino.databaseName}`);

    // 3. Fotos
    const origenLocal = await leerCatalogo(dbOrigen);
    const problemasFotos = await prepararFotos(origenLocal);
    if (problemasFotos.length > 0) {
      parar(
        `Hay fotos que todavía no estarían en la web publicada:\n  ${problemasFotos.join("\n  ")}\n\n` +
          "  Haz commit de public/images/ (también public/images/catalogo/), une el pull request a main,\n" +
          "  espera a que Render lo publique y vuelve a ejecutar este script. No se ha escrito nada.",
      );
    }
    const origen = adaptarImagenes(origenLocal);

    // 4. Simulación
    const destino = await leerCatalogo(dbDestino);
    const plan = planificarCopia(origen, destino, await leerUso(dbDestino));
    const hayCambios = mostrarPlan(plan);
    if (plan.conflictos.length > 0) {
      parar(
        `No se puede copiar sin romper datos de clientes:\n  ${plan.conflictos.join("\n  ")}\n\n` +
          "  Revisa esos códigos, pedidos o alumnos de producción (¿son de prueba?) y pregunta antes de seguir.\n" +
          "  No se ha escrito nada.",
      );
    }
    if (!hayCambios) {
      console.log("\n✔ Producción ya tiene el mismo catálogo que local. No hay nada que escribir.");
      return;
    }
    if (SOLO_SIMULAR) {
      console.log("\nSolo simulación (--dry-run): no se ha escrito nada.");
      return;
    }
    if (
      (
        await preguntar("\n¿Aplicar estos cambios en producción? Escribe «si» para continuar: ")
      ).toLowerCase() !== "si"
    ) {
      parar("Cancelado. No se ha escrito nada.");
    }

    // 5. Copia de seguridad del catálogo de producción y escritura en una transacción
    const protegidasAntes = await contar(dbDestino, PROTEGIDAS_RESUMEN);
    const fecha = new Date()
      .toLocaleString("sv-SE")
      .slice(0, 19)
      .replace(" ", "_")
      .replaceAll(":", "-");
    const archivo = path.join("copias", `catalogo-${DESTINO_ESPERADO}_${fecha}.json`);
    await mkdir("copias", { recursive: true });
    await writeFile(
      archivo,
      EJSON.stringify(
        {
          baseDeDatos: dbDestino.databaseName,
          host: hostDestino,
          creadaEn: new Date(),
          colecciones: destino,
        },
        { relaxed: false },
      ),
    );
    console.log(`\n✔ Copia de seguridad del catálogo de producción: ${archivo}`);

    const sesion = clienteDestino.startSession();
    try {
      await sesion.withTransaction(async () => {
        // Primero se borra (de los hijos a los padres) y después se crea/actualiza (de los padres a los hijos)
        for (const nombre of [...COLECCIONES_CATALOGO].reverse()) {
          const ids = plan.colecciones[nombre].borrar.map((d) => d._id);
          if (ids.length > 0)
            await dbDestino
              .collection(nombre)
              .deleteMany({ _id: { $in: ids } }, { session: sesion });
        }
        for (const nombre of COLECCIONES_CATALOGO) {
          const docs = [...plan.colecciones[nombre].crear, ...plan.colecciones[nombre].actualizar];
          if (docs.length === 0) continue;
          await dbDestino.collection<Doc>(nombre).bulkWrite(
            docs.map((doc) => ({
              replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
            })),
            { session: sesion, ordered: true },
          );
        }
      });
    } catch (error) {
      parar(
        `La escritura ha fallado y se ha deshecho (producción sigue como estaba).\n  Motivo: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await sesion.endSession();
    }
    console.log("✔ Catálogo copiado en producción.");

    // 6. Comprobación y resumen
    const final = planificarCopia(origen, await leerCatalogo(dbDestino), await leerUso(dbDestino));
    const pendientes = COLECCIONES_CATALOGO.reduce(
      (total, n) =>
        total +
        final.colecciones[n].crear.length +
        final.colecciones[n].actualizar.length +
        final.colecciones[n].borrar.length,
      0,
    );
    const protegidasDespues = await contar(dbDestino, PROTEGIDAS_RESUMEN);
    const totalesOrigen = await contar(dbOrigen, COLECCIONES_CATALOGO);
    const totalesDestino = await contar(dbDestino, COLECCIONES_CATALOGO);
    console.log("\nRESUMEN               local  producción");
    for (const nombre of COLECCIONES_CATALOGO) {
      console.log(
        `  ${nombre.padEnd(18)} ${String(totalesOrigen[nombre]).padStart(5)}  ${String(totalesDestino[nombre]).padStart(10)}`,
      );
    }
    console.log("\nDatos de clientes en producción (no se tocan)   antes  después");
    for (const nombre of PROTEGIDAS_RESUMEN) {
      console.log(
        `  ${nombre.padEnd(44)} ${String(protegidasAntes[nombre]).padStart(5)}  ${String(protegidasDespues[nombre]).padStart(7)}`,
      );
    }
    if (pendientes > 0)
      parar(
        `La comprobación final encuentra ${pendientes} diferencias. Vuelve a ejecutar el script.`,
      );
    console.log(
      "\n✔ Comprobado: el catálogo de producción es igual al de local" +
        (COLECCIONES_CATALOGO.some((n) => final.colecciones[n].conservar.length > 0)
          ? " (más lo conservado con «!»)."
          : "."),
    );
    console.log(
      "\n  ÚLTIMO PASO: la portada, /kits y las fichas se generan al compilar. Para que la web enseñe el\n" +
        "  catálogo nuevo, en Render: Manual Deploy → Deploy latest commit (y quita tu IP de Network Access).",
    );
  } finally {
    await clienteOrigen.close();
    await clienteDestino.close();
  }
}

// Comprobación de que la lista de colecciones protegidas no se cruza con las del catálogo
if (COLECCIONES_PROTEGIDAS.some((n) => (COLECCIONES_CATALOGO as readonly string[]).includes(n))) {
  parar("Error interno: una colección protegida está en la lista del catálogo.");
}

main().catch((error: unknown) => parar(error instanceof Error ? error.message : String(error)));
