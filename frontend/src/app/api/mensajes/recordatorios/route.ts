/**
 * RECORDATORIOS A SU HORA: POST /api/mensajes/recordatorios (solo el propio servidor).
 * src/instrumentation.ts la llama cada minuto con la clave interna (cabecera x-clave-interna):
 * así los recordatorios de tareas suenan en el móvil aunque nadie tenga la web abierta.
 * A cualquier otro le responde 404.
 */
import { claveInternaValida } from "@/lib/claveInterna";
import { mandarRecordatorios } from "@/lib/mensajes/recordatorios";

export async function POST(peticion: Request) {
  if (!claveInternaValida("recordatorios", peticion.headers.get("x-clave-interna"))) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }
  await mandarRecordatorios();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
