/**
 * AVISO DE PRUEBA: POST /api/push/prueba → manda un aviso a todos MIS aparatos con avisos.
 * Para comprobar en /mensajes/avisos que llegan bien. Solo el equipo (si no, 404).
 */
import { esDelEquipo } from "@/config/equipo";
import { registrarIntento } from "@/lib/limite";
import { mismoSitio } from "@/lib/mismoSitio";
import { aparatosConAvisos, avisarPorPush } from "@/lib/push/push";
import { obtenerUsuario } from "@/lib/sesion";

export async function POST(peticion: Request) {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol))
    return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!mismoSitio(peticion)) return Response.json({ error: "No permitido" }, { status: 403 });
  if (!(await registrarIntento("avisosPush", yo.id)))
    return Response.json({ error: "Demasiadas pruebas. Espera un rato." }, { status: 429 });
  const aparatos = await aparatosConAvisos(yo.id);
  if (aparatos.length === 0)
    return Response.json(
      { error: "Este aparato aún no tiene los avisos activados." },
      { status: 400 },
    );
  await avisarPorPush([yo.id], {
    titulo: "🔔 Aviso de prueba",
    cuerpo: `¡Funciona, ${yo.nombre.split(" ")[0]}! Así te avisaremos de cada mensaje nuevo.`,
    url: "/mensajes/avisos",
    etiqueta: "prueba",
    ruta: "avisos",
  });
  return Response.json({ ok: true, aparatos: aparatos.length });
}
