/**
 * MENSAJES SIN LEER Y ALARMAS: GET /api/mensajes/no-leidos → { total, alarmas }
 * Lo pide el menú del panel (ContadorMensajes) cada poco: el número rojo de «Mensajes» y las
 * alarmas de tareas que tienen que sonarle a esta persona y las videollamadas que le llaman.
 * De paso, manda por correo los recordatorios que ya tocan (así no hace falta una tarea
 * programada en Render).
 * Solo para el equipo; a cualquier otro le responde 404, como si no existiera.
 */
import { after } from "next/server";
import { esDelEquipo } from "@/config/equipo";
import { textoFechaTarea } from "@/config/mensajes";
import { llamadasQueMeSuenan } from "@/lib/mensajes/llamadas";
import { misAlarmas, totalNoLeidos, ultimoSinLeer } from "@/lib/mensajes/mensajes";
import { mandarRecordatorios } from "@/lib/mensajes/recordatorios";
import { obtenerUsuario } from "@/lib/sesion";

export async function GET() {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }
  // Después de responder, para no hacer esperar al menú
  after(mandarRecordatorios);
  const [total, alarmas, ultimo, llamadas] = await Promise.all([
    totalNoLeidos(yo),
    misAlarmas(yo),
    ultimoSinLeer(yo),
    llamadasQueMeSuenan(yo),
  ]);
  return Response.json(
    {
      total,
      ultimo,
      llamadas,
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
