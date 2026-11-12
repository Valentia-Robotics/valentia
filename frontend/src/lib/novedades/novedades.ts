/**
 * CORREOS DE NOVEDADES: base de datos y envío
 * Reglas puras (quién los recibe, validación) en src/config/novedades.ts.
 *
 * Cómo se envía: al pulsar «Enviar» se guarda el correo y se responde enseguida; los correos salen
 * después, uno a uno (after), y cada envío se apunta en EnvioNovedades ANTES de mandarlo. Así:
 *   - nadie lo recibe dos veces (aunque se pulse «Seguir enviando» con el envío aún en marcha);
 *   - si el servidor se reinicia a medias (al publicar), «Seguir enviando» manda solo lo que faltaba.
 */
import "server-only";
import { Prisma } from "@/generated/prisma/client";
import {
  ESPERA_ENTRE_CORREOS_MS,
  FILTRO_DESTINATARIOS,
  parrafosDeTexto,
  type DatosCorreoNovedades,
} from "@/config/novedades";
import { enviarCorreo } from "@/lib/correo";
import { plantillaNovedades } from "@/lib/correo/plantillas";
import { db } from "@/lib/db";
import { urlBaja, urlBajaUnClic } from "./baja";

/** Cuántas cuentas quieren recibirlos, cuántas no y cuántas aún no lo han dicho (solo clientes con email confirmado) */
export async function resumenDestinatarios() {
  const base = { emailVerificadoEn: { not: null } } as const;
  const [si, no, sinDecir] = await Promise.all([
    db.usuario.count({ where: FILTRO_DESTINATARIOS }),
    db.usuario.count({ where: { ...base, novedades: false } }),
    db.usuario.count({ where: { ...base, novedades: null } }),
  ]);
  return { si, no, sinDecir };
}

/** Prepara el correo de una persona (lo usan el envío y «Mandarme una prueba») */
export function correoPara(
  datos: DatosCorreoNovedades,
  persona: { id: string; email: string; nombre: string },
) {
  const correo = plantillaNovedades({
    para: persona.email,
    nombre: persona.nombre,
    asunto: datos.asunto,
    titulo: datos.titulo,
    parrafos: parrafosDeTexto(datos.texto),
    boton:
      datos.botonTexto && datos.botonUrl
        ? { texto: datos.botonTexto, url: datos.botonUrl }
        : undefined,
    urlBaja: urlBaja(persona.id),
  });
  // El botón «Cancelar suscripción» que Gmail y Yahoo ponen junto al remitente (lo exigen para envíos a muchos)
  correo.cabeceras = {
    "List-Unsubscribe": `<${urlBajaUnClic(persona.id)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  return correo;
}

/** Guarda el correo y empieza a mandarlo. Devuelve su id y a cuántas personas va */
export async function crearCorreoNovedades(datos: DatosCorreoNovedades, autorId: string) {
  const total = await db.usuario.count({ where: FILTRO_DESTINATARIOS });
  const creado = await db.correoNovedades.create({
    data: {
      asunto: datos.asunto,
      titulo: datos.titulo,
      texto: datos.texto,
      botonTexto: datos.botonTexto || null,
      botonUrl: datos.botonUrl || null,
      autorId,
      total,
    },
    select: { id: true },
  });
  return { id: creado.id, total };
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Manda el correo a todos los que deben recibirlo y aún no lo tienen. Se puede llamar las veces
 * que haga falta (no repite). Quien se da de baja durante el envío ya no lo recibe.
 */
export async function mandarPendientes(correoId: string): Promise<void> {
  const correo = await db.correoNovedades.findUnique({ where: { id: correoId } });
  if (!correo || correo.terminadoEn) return;
  const datos: DatosCorreoNovedades = {
    asunto: correo.asunto,
    titulo: correo.titulo,
    texto: correo.texto,
    botonTexto: correo.botonTexto ?? "",
    botonUrl: correo.botonUrl ?? "",
  };

  const yaEnviados = new Set(
    (await db.envioNovedades.findMany({ where: { correoId }, select: { usuarioId: true } })).map(
      (e) => e.usuarioId,
    ),
  );
  const personas = await db.usuario.findMany({
    where: FILTRO_DESTINATARIOS,
    select: { id: true },
    orderBy: { creadoEn: "asc" },
  });

  for (const { id } of personas) {
    if (yaEnviados.has(id)) continue;
    // Volvemos a mirar justo antes: si se ha dado de baja mientras tanto, no se le manda
    const persona = await db.usuario.findFirst({
      where: { id, ...FILTRO_DESTINATARIOS },
      select: { id: true, email: true, nombre: true },
    });
    if (!persona) continue;
    try {
      // Primero se apunta (si otro envío ya lo apuntó, el único de la BD lo para): nunca dos veces
      await db.envioNovedades.create({ data: { correoId, usuarioId: id, ok: false } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
    const ok = await enviarCorreo(correoPara(datos, persona));
    await db.envioNovedades.update({
      where: { correoId_usuarioId: { correoId, usuarioId: id } },
      data: { ok },
    });
    await db.correoNovedades.update({ where: { id: correoId }, data: { avanceEn: new Date() } });
    await esperar(ESPERA_ENTRE_CORREOS_MS);
  }

  await db.correoNovedades.update({ where: { id: correoId }, data: { terminadoEn: new Date() } });
}

/** Los correos enviados, del más nuevo al más antiguo, con cuántos han salido bien y cuántos no */
export async function listarCorreosNovedades() {
  const correos = await db.correoNovedades.findMany({
    orderBy: { creadoEn: "desc" },
    take: 50,
    include: { autor: { select: { nombre: true } } },
  });
  const cuentas = await db.envioNovedades.groupBy({
    by: ["correoId", "ok"],
    where: { correoId: { in: correos.map((c) => c.id) } },
    _count: { _all: true },
  });
  const cuenta = (correoId: string, ok: boolean) =>
    cuentas.find((c) => c.correoId === correoId && c.ok === ok)?._count._all ?? 0;
  return correos.map((c) => ({
    ...c,
    enviados: cuenta(c.id, true),
    fallidos: cuenta(c.id, false),
  }));
}

/** Apunta si la persona quiere recibir novedades (y cuándo lo dijo) */
export async function guardarPreferenciaNovedades(usuarioId: string, quiere: boolean) {
  await db.usuario.update({
    where: { id: usuarioId },
    data: { novedades: quiere, novedadesEn: new Date() },
  });
}
