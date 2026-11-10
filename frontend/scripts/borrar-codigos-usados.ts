/**
 * BORRAR CÓDIGOS YA USADOS (excepcional) — pensado para la Shell de Render
 * El panel solo deja borrar códigos que nadie ha usado. Esto es para quitar, de forma
 * excepcional, códigos usados en pruebas para que no cuenten en las cifras reales.
 *
 *   1. Enseña todos los códigos usados (código, kit, quién lo usó y cuándo).
 *   2. Pide los códigos que quieres borrar.
 *   3. Pide que escribas BORRAR para confirmar.
 *
 * Quien activó el código conserva su curso: solo se borra el código.
 * Uso:  npm run codigos:borrar-usados
 */
import { crearClienteScripts } from "../prisma/catalogo";
import { preguntar } from "./consola";

// Usa DATABASE_URL (en Render, la del servicio)
const db = crearClienteScripts();

const fecha = (d: Date | null) =>
  d ? d.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }) : "—";

async function main() {
  const usados = await db.codigoActivacion.findMany({
    where: { usadoEn: { not: null } },
    orderBy: { usadoEn: "asc" },
    select: {
      id: true,
      codigo: true,
      usadoEn: true,
      loteId: true,
      kit: { select: { nombre: true } },
      usuario: { select: { email: true } },
      pedido: { select: { numero: true } },
    },
  });
  if (usados.length === 0) {
    console.log("No hay ningún código usado. Nada que borrar.");
    return;
  }

  console.log(`Códigos usados (${usados.length}):\n`);
  for (const c of usados) {
    console.log(
      `  ${c.codigo}  ·  ${c.kit.nombre}  ·  ${c.usuario?.email ?? "cuenta borrada"}  ·  ${fecha(c.usadoEn)}` +
        (c.pedido ? `  ·  pedido ${c.pedido.numero}` : ""),
    );
  }

  const escritos = (await preguntar("\nCódigos que quieres borrar (separados por espacios): "))
    .toUpperCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  const elegidos = usados.filter((c) => escritos.includes(c.codigo));
  const noEncontrados = escritos.filter((e) => !usados.some((c) => c.codigo === e));
  if (noEncontrados.length > 0) {
    console.log(`\n✖ Estos no están en la lista de usados: ${noEncontrados.join(", ")}`);
    console.log("  No se ha borrado nada. Vuelve a ejecutar el comando y cópialos tal cual.");
    process.exitCode = 1;
    return;
  }
  if (elegidos.length === 0) {
    console.log("No has escrito ningún código. No se ha borrado nada.");
    return;
  }

  console.log(
    `\nVas a borrar ${elegidos.length} código(s): ${elegidos.map((c) => c.codigo).join(", ")}`,
  );
  console.log("Dejarán de contar como usados. Quien los activó conserva su curso.");
  if ((await preguntar("Escribe BORRAR para confirmar: ")) !== "BORRAR") {
    console.log("No se ha borrado nada.");
    return;
  }

  const ids = elegidos.map((c) => c.id);
  await db.$transaction(async (tx) => {
    await tx.codigoActivacion.deleteMany({ where: { id: { in: ids } } });
    // Los lotes afectados se quedan con los códigos que les quedan (vacío = se borra)
    const lotes = [...new Set(elegidos.flatMap((c) => (c.loteId ? [c.loteId] : [])))];
    for (const loteId of lotes) {
      const quedan = await tx.codigoActivacion.count({ where: { loteId } });
      if (quedan === 0) await tx.loteCodigos.delete({ where: { id: loteId } });
      else await tx.loteCodigos.update({ where: { id: loteId }, data: { cantidad: quedan } });
    }
  });
  console.log(`\n✔ Borrados ${elegidos.length} código(s). Recarga /admin/codigos para verlo.`);
}

main()
  .catch((error) => {
    console.error("✖ No se pudo terminar:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
