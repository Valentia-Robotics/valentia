/**
 * RECORDATORIOS DE TAREAS QUE YA TOCAN: a cada uno se le manda una vez un correo y un aviso push.
 * Se llama desde el contador del menú (cada vez que alguien del equipo tiene la web abierta) y,
 * en el servidor, cada minuto (src/instrumentation.ts → /api/mensajes/recordatorios), así suenan
 * a su hora aunque nadie tenga la web abierta.
 */
import "server-only";
import { datosPrioridad, textoFechaTarea } from "@/config/mensajes";
import { avisoDeRecordatorio } from "@/config/push";
import { enviarCorreo } from "@/lib/correo";
import { plantillaRecordatorioTarea } from "@/lib/correo/plantillas";
import { avisarPorPush } from "@/lib/push/push";
import { recordatoriosPorEnviar } from "./mensajes";

export async function mandarRecordatorios() {
  try {
    for (const t of await recordatoriosPorEnviar()) {
      const entrega = t.entregaEn ? textoFechaTarea(t.entregaEn) : null;
      await Promise.all([
        avisarPorPush(
          [t.destinoId],
          avisoDeRecordatorio({ id: t.id, texto: t.texto, entrega, ruta: t.ruta }),
        ),
        enviarCorreo(
          plantillaRecordatorioTarea({
            para: t.destino.email,
            nombre: t.destino.nombre,
            texto: t.texto,
            de: t.autorNombre,
            entrega,
            prioridad: datosPrioridad(t.prioridad)?.nombre ?? null,
            ruta: t.ruta,
          }),
        ),
      ]);
    }
  } catch (error) {
    console.error("[mensajes] No se han podido mandar los recordatorios.", error);
  }
}
