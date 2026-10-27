/**
 * Descarga de la lista de espera en CSV (se abre con Excel o Google Sheets).
 * Solo para ADMIN: sin permiso, 404.
 */
import { db } from "@/lib/db";
import { obtenerUsuario } from "@/lib/sesion";

/** Entre comillas y sin fórmulas: un email como "=HYPERLINK(…)" no se ejecuta al abrirlo en Excel */
function celda(valor: string): string {
  const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replaceAll('"', '""')}"`;
}

export async function GET() {
  const usuario = await obtenerUsuario();
  if (usuario?.rol !== "ADMIN") return new Response("No encontrado", { status: 404 });

  const filas = await db.listaEspera.findMany({ orderBy: { creadoEn: "asc" } });
  const lineas = [
    ["email", "kit", "donde", "fecha"].join(";"),
    ...filas.map((f) =>
      [f.email, f.kitSlug ?? "", f.origen, f.creadoEn.toISOString().slice(0, 10)]
        .map(celda)
        .join(";"),
    ),
  ];
  // El BOM (﻿) hace que Excel lea bien las tildes
  return new Response("﻿" + lineas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lista-de-espera.csv"',
      "Cache-Control": "no-store",
    },
  });
}
