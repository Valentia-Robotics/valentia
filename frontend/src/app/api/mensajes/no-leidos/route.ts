/**
 * MENSAJES SIN LEER Y ALARMAS: GET /api/mensajes/no-leidos → { total, alarmas }
 * Lo pide el menú del panel (ContadorMensajes) cada poco: el número rojo de «Mensajes» y las
 * alarmas de tareas que tienen que sonarle a esta persona. De paso, manda por correo los
 * recordatorios que ya tocan (así no hace falta una tarea programada en Render).
 * Solo para el equipo; a cualquier otro le responde 404, como si no existiera.
 */
import { after } from "next/server";
import { esDelEquipo } from "@/config/equipo";
import { datosPrioridad, textoFechaTarea } from "@/config/mensajes";
import { enviarCorreo } from "@/lib/correo";
import { plantillaRecordatorioTarea } from "@/lib/correo/plantillas";
import { misAlarmas, recordatoriosPorEnviar, totalNoLeidos } from "@/lib/mensajes/mensajes";
import { obtenerUsuario } from "@/lib/sesion";

async function mandarRecordatorios() {
  try {
    for (const t of await recordatoriosPorEnviar()) {
      await enviarCorreo(
        plantillaRecordatorioTarea({
          para: t.destino.email,
          nombre: t.destino.nombre,
          texto: t.texto,
          de: t.autorNombre,
          entrega: t.entregaEn ? textoFechaTarea(t.entregaEn) : null,
          prioridad: datosPrioridad(t.prioridad)?.nombre ?? null,
          ruta: t.ruta,
        }),
      );
    }
  } catch (error) {
    console.error("[mensajes] No se han podido mandar los recordatorios.", error);
  }
}

export async function GET() {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }
  // Después de responder, para no hacer esperar al menú
  after(mandarRecordatorios);
  const [total, alarmas] = await Promise.all([totalNoLeidos(yo), misAlarmas(yo)]);
  return Response.json(
    {
      total,
      alarmas: alarmas.map((a) => ({
        id: a.id,
        ruta: a.ruta,
        texto: a.texto,
        de: a.autorNombre,
        prioridad: a.prioridad,
        entrega: a.entregaEn ? textoFechaTarea(a.entregaEn) : null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
