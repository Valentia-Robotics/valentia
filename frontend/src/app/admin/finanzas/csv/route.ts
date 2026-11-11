/**
 * Descarga de los ingresos y gastos del periodo en CSV (Excel o Google Sheets),
 * por ejemplo para pasárselo a la gestoría. Solo para ADMIN: sin permiso, 404.
 */
import { tieneAccesoAdmin } from "@/config/equipo";
import { diaEnEspana, leerPeriodo, nombreCategoria, periodoEnTexto } from "@/config/finanzas";
import { obtenerFinanzas } from "@/lib/admin/finanzas";
import { obtenerUsuario } from "@/lib/sesion";

/** Entre comillas y sin fórmulas: un texto como "=HYPERLINK(…)" no se ejecuta al abrirlo en Excel */
function celda(valor: string): string {
  const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replaceAll('"', '""')}"`;
}

/** Céntimos → "24,90" (coma decimal, como lo espera Excel en español) */
const euros = (centimos: number) => (centimos / 100).toFixed(2).replace(".", ",");

export async function GET(request: Request) {
  const usuario = await obtenerUsuario();
  if (!tieneAccesoAdmin(usuario?.rol)) return new Response("No encontrado", { status: 404 });

  const periodo = leerPeriodo(new URL(request.url).searchParams.get("periodo"));
  const { movimientos } = await obtenerFinanzas(periodo);
  const lineas = [
    [
      "fecha",
      "tipo",
      "categoria",
      "concepto",
      "proveedor o cliente",
      "importe",
      "iva",
      "sin iva",
      "origen",
    ].join(";"),
    ...[...movimientos]
      .reverse()
      .map((m) =>
        [
          diaEnEspana(m.fecha),
          m.tipo === "INGRESO" ? "Ingreso" : "Gasto",
          nombreCategoria(m.categoria),
          m.concepto,
          m.contraparte,
          euros(m.importeCentimos),
          euros(m.ivaCentimos),
          euros(m.importeCentimos - m.ivaCentimos),
          m.origen === "pedido" ? "Pedido de la web" : "Apuntado a mano",
        ]
          .map(celda)
          .join(";"),
      ),
  ];
  // El BOM (﻿) hace que Excel lea bien las tildes
  return new Response("﻿" + lineas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finanzas-${periodoEnTexto(periodo)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
