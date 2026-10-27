/**
 * ESTADÍSTICAS DE VISITAS: el navegador avisa aquí de cada página vista (ContadorVisitas).
 *
 * No usa cookies ni guarda la IP. Para contar personas distintas se guarda una huella
 * (HMAC con AUTH_SECRET) de IP + navegador + día: cambia cada día y no se puede deshacer.
 * Robots y herramientas automáticas no se cuentan. Siempre responde 204 (sin contenido),
 * pase lo que pase: una estadística que falla nunca debe molestar a quien navega.
 */
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { ipDeCabeceras, registrarIntento } from "@/lib/limite";
import {
  calcularOrigen,
  diaEnEspana,
  esRobot,
  normalizarRuta,
  tipoDispositivo,
} from "@/lib/visitas/reglas";

export const dynamic = "force-dynamic";

/** Las visitas se borran pasados estos días (13 meses) */
const DIAS_GUARDADAS = 400;

const dominioPropio = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").hostname;
  } catch {
    return "localhost";
  }
})();

const nada = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    const navegador = request.headers.get("user-agent");
    if (esRobot(navegador)) return nada();

    const datos: unknown = await request.json().catch(() => null);
    if (!datos || typeof datos !== "object") return nada();
    const { ruta, entrada, referente, utm } = datos as Record<string, unknown>;

    const rutaLimpia = normalizarRuta(ruta);
    if (!rutaLimpia) return nada();

    const ip = ipDeCabeceras(request.headers);
    // Evita que alguien infle las cifras recargando sin parar
    if (!(await registrarIntento("visita", ip))) return nada();

    const dia = diaEnEspana();
    const visitante = createHmac("sha256", process.env.AUTH_SECRET ?? "valentia")
      .update(`${dia}|${ip}|${navegador}`)
      .digest("base64url")
      .slice(0, 22);
    const esEntrada = entrada === true;

    await db.visita.create({
      data: {
        dia,
        ruta: rutaLimpia,
        entrada: esEntrada,
        origen: esEntrada ? calcularOrigen(referente, utm, dominioPropio) : null,
        dispositivo: tipoDispositivo(navegador ?? ""),
        visitante,
      },
    });

    // Limpieza de vez en cuando (1 de cada 200) para que la tabla no crezca sin fin
    if (Math.random() < 0.005) {
      await db.visita.deleteMany({
        where: { creadoEn: { lt: new Date(Date.now() - DIAS_GUARDADAS * 86_400_000) } },
      });
    }
  } catch (error) {
    console.error("[visitas] No se ha podido guardar la visita.", error);
  }
  return nada();
}
