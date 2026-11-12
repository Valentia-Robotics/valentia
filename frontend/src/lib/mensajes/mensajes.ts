/**
 * MENSAJES DEL EQUIPO (base de datos). Las reglas puras están en src/config/mensajes.ts.
 *
 * Permisos, en un solo sitio:
 *   - Solo los roles del equipo (src/config/equipo.ts) usan los mensajes. Un cliente, nada.
 *   - El «General» lo leen y escriben todos los del equipo; los grupos de cada departamento
 *     (Hardware, Edición), solo los de ese departamento (GRUPOS en src/config/mensajes.ts).
 *   - Un chat privado solo lo ven sus dos personas (tampoco los administradores) y solo se puede
 *     abrir con alguien que sigue en el equipo.
 */
import "server-only";
import { createHash } from "node:crypto";
import {
  CANAL_GENERAL,
  MENSAJES_POR_CHAT,
  canalDeRuta,
  grupoDe,
  gruposDe,
  personasDelCanal,
  resumenMensaje,
  type DatosTarea,
  type Estado,
  type Prioridad,
} from "@/config/mensajes";
import { esDelEquipo, ROLES_EQUIPO, tieneAccesoAdmin } from "@/config/equipo";
import type { Rol } from "@/generated/prisma/enums";
import { borrarPrivado } from "@/lib/almacenamiento/privado";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import type { UsuarioActual } from "@/lib/sesion";
import type { ImagenGuardada } from "./imagenes";

export class ErrorMensaje extends Error {}

export interface Companero {
  id: string;
  nombre: string;
  foto: string | null;
  rol: Rol;
  ultimaConexionEn: Date | null;
}

/** Todos los del equipo menos yo, por nombre */
export async function companeros(yo: UsuarioActual): Promise<Companero[]> {
  return db.usuario.findMany({
    where: { rol: { in: ROLES_EQUIPO.map((r) => r.rol) }, id: { not: yo.id } },
    select: { id: true, nombre: true, foto: true, rol: true, ultimaConexionEn: true },
    orderBy: { nombre: "asc" },
  });
}

/** Los que están en un grupo menos yo, por nombre (en el General, todo el equipo) */
export async function companerosDelGrupo(yo: UsuarioActual, canal: string): Promise<Companero[]> {
  const grupo = grupoDe(canal);
  if (!grupo) return [];
  return db.usuario.findMany({
    where: { AND: [grupo.filtro, { id: { not: yo.id } }] },
    select: { id: true, nombre: true, foto: true, rol: true, ultimaConexionEn: true },
    orderBy: { nombre: "asc" },
  });
}

/**
 * Comprueba que «yo» puede usar ese canal. Para un chat privado, que la otra persona siga en el
 * equipo (si ya no lo está, el chat se puede leer pero no escribir). Devuelve la otra persona.
 */
async function comprobarCanal(
  yo: UsuarioActual,
  canal: string,
): Promise<{ otro: Companero | null; puedeEscribir: boolean }> {
  if (!esDelEquipo(yo.rol)) throw new ErrorMensaje("Esta sección es solo para el equipo.");
  const grupo = grupoDe(canal);
  if (grupo) {
    if (!grupo.esMiembro(yo)) throw new ErrorMensaje("Este grupo es solo para su equipo.");
    return { otro: null, puedeEscribir: true };
  }
  const personas = personasDelCanal(canal);
  if (!personas || !personas.includes(yo.id)) throw new ErrorMensaje("Ese chat no existe.");
  const otroId = personas[0] === yo.id ? personas[1] : personas[0];
  const otro = await db.usuario.findUnique({
    where: { id: otroId },
    select: { id: true, nombre: true, foto: true, rol: true, ultimaConexionEn: true },
  });
  if (!otro) throw new ErrorMensaje("Esa persona ya no existe.");
  return { otro, puedeEscribir: esDelEquipo(otro.rol) };
}

/** Un mensaje como lo ve la pantalla */
export interface Mensaje {
  id: string;
  autorId: string | null;
  autorNombre: string;
  texto: string;
  creadoEn: Date;
  /** Si lleva imagen, su tamaño (para reservar el hueco). La imagen se pide a /api/mensajes/imagen/<id> */
  imagen: { ancho: number | null; alto: number | null } | null;
  esTarea: boolean;
  estadoTarea: Estado;
  prioridad: Prioridad | null;
  entregaEn: Date | null;
  responsableId: string | null;
  responsableNombre: string | null;
  recordarEn: Date | null;
  hechaEn: Date | null;
  hechaPor: string | null;
}

const camposMensaje = {
  id: true,
  autorId: true,
  autorNombre: true,
  texto: true,
  creadoEn: true,
  esTarea: true,
  estadoTarea: true,
  prioridad: true,
  entregaEn: true,
  responsableId: true,
  responsableNombre: true,
  recordarEn: true,
  hechaEn: true,
  hechaPor: true,
  imagenClave: true,
  imagenAncho: true,
  imagenAlto: true,
} as const;

/** De la fila de la BD a lo que ve la pantalla: la clave del almacén nunca sale del servidor */
function aMensaje<
  T extends { imagenClave: string | null; imagenAncho: number | null; imagenAlto: number | null },
>({ imagenClave, imagenAncho, imagenAlto, ...resto }: T) {
  return {
    ...resto,
    imagen: imagenClave ? { ancho: imagenAncho, alto: imagenAlto } : null,
  };
}

/** Hasta cuándo ha leído el chat cada una de las OTRAS personas que lo ven (para los tics azules) */
export interface LecturaDeOtro {
  id: string;
  nombre: string;
  /** Milisegundos; 0 = no lo ha abierto nunca */
  leidoHasta: number;
}

async function lecturasDeOtros(
  yo: UsuarioActual,
  canal: string,
  otro: { id: string; nombre: string } | null,
): Promise<LecturaDeOtro[]> {
  const personas = otro ? [otro] : await companerosDelGrupo(yo, canal);
  if (personas.length === 0) return [];
  const lecturas = await db.lecturaCanal.findMany({
    where: { canal, usuarioId: { in: personas.map((p) => p.id) } },
    select: { usuarioId: true, leidoHasta: true },
  });
  const hasta = new Map(lecturas.map((l) => [l.usuarioId, l.leidoHasta.getTime()]));
  return personas.map((p) => ({ id: p.id, nombre: p.nombre, leidoHasta: hasta.get(p.id) ?? 0 }));
}

/**
 * Abre un chat desde su dirección (/mensajes/<ruta>): sus últimos mensajes y, de paso, lo marca
 * como leído. null si la dirección no vale (la página da 404).
 */
export async function abrirChat(yo: UsuarioActual, ruta: string) {
  const canal = canalDeRuta(ruta, yo.id);
  if (!canal) return null;
  let datos;
  try {
    datos = await comprobarCanal(yo, canal);
  } catch (error) {
    if (error instanceof ErrorMensaje) return null;
    throw error;
  }
  // Un chat privado con alguien que no es del equipo y sin mensajes: no existe
  if (datos.otro && !datos.puedeEscribir) {
    const alguno = await db.mensajeEquipo.findFirst({ where: { canal }, select: { id: true } });
    if (!alguno) return null;
  }
  const recientes = await db.mensajeEquipo.findMany({
    where: { canal },
    select: camposMensaje,
    orderBy: { creadoEn: "desc" },
    take: MENSAJES_POR_CHAT,
  });
  await marcarLeido(yo, canal);
  const lecturas = await lecturasDeOtros(yo, canal, datos.otro);
  return { canal, ...datos, mensajes: recientes.reverse().map(aMensaje), lecturas };
}

/** Apunta que «yo» ha leído el canal hasta ahora */
export async function marcarLeido(yo: UsuarioActual, canal: string) {
  const ahora = new Date();
  await db.lecturaCanal.upsert({
    where: { usuarioId_canal: { usuarioId: yo.id, canal } },
    create: { usuarioId: yo.id, canal, leidoHasta: ahora },
    update: { leidoHasta: ahora },
  });
}

/** Mensajes sin leer de cada canal (solo los que escribieron otros) */
async function noLeidosPorCanal(yo: UsuarioActual, canales: string[]) {
  const lecturas = await db.lecturaCanal.findMany({
    where: { usuarioId: yo.id, canal: { in: canales } },
    select: { canal: true, leidoHasta: true },
  });
  const leido = new Map(lecturas.map((l) => [l.canal, l.leidoHasta]));
  const grupos = await db.mensajeEquipo.groupBy({
    by: ["canal"],
    where: {
      OR: canales.map((canal) => ({
        canal,
        creadoEn: { gt: leido.get(canal) ?? new Date(0) },
        // Los que no tienen autor (cuenta borrada) también cuentan
        NOT: { autorId: yo.id },
      })),
    },
    _count: { _all: true },
  });
  return new Map(grupos.map((g) => [g.canal, g._count._all]));
}

/** Total de mensajes sin leer (el número rojo del menú) */
export async function totalNoLeidos(yo: UsuarioActual): Promise<number> {
  if (!esDelEquipo(yo.rol)) return 0;
  const otros = await companeros(yo);
  const canales = [
    ...gruposDe(yo).map((g) => g.canal),
    ...otros.map((o) => canalDeRuta(o.id, yo.id)!),
  ];
  // También los privados con alguien que ya no está en el equipo
  const conMensajes = await db.mensajeEquipo.findMany({
    where: { canal: { startsWith: "privado:", contains: yo.id } },
    distinct: ["canal"],
    select: { canal: true },
  });
  for (const { canal } of conMensajes) if (!canales.includes(canal)) canales.push(canal);
  const mapa = await noLeidosPorCanal(yo, canales);
  return [...mapa.values()].reduce((a, b) => a + b, 0);
}

export interface Conversacion {
  /** El grupo ("general", "hardware"…) o el id de la otra persona: va en la dirección /mensajes/<ruta> */
  ruta: string;
  nombre: string;
  foto: string | null;
  rol: Rol | null;
  ultimaConexionEn: Date | null;
  ultimo: { texto: string; autorNombre: string; mio: boolean; creadoEn: Date } | null;
  noLeidos: number;
}

/**
 * La lista de chats, como la de WhatsApp: los grupos arriba (General y los de mi departamento) y después las conversaciones
 * privadas, primero las que tienen mensajes más recientes; luego el resto del equipo por nombre.
 */
export async function listarConversaciones(yo: UsuarioActual): Promise<Conversacion[]> {
  const otros = await companeros(yo);
  const grupos = gruposDe(yo);
  const lista: (Conversacion & { canal: string })[] = [
    ...grupos.map((g) => ({
      canal: g.canal,
      ruta: g.canal,
      nombre: g.nombre,
      foto: null,
      rol: null,
      ultimaConexionEn: null,
      ultimo: null,
      noLeidos: 0,
    })),
    ...otros.map((o) => ({
      canal: canalDeRuta(o.id, yo.id)!,
      ruta: o.id,
      nombre: o.nombre,
      foto: o.foto,
      rol: o.rol,
      ultimaConexionEn: o.ultimaConexionEn,
      ultimo: null,
      noLeidos: 0,
    })),
  ];

  // Chats privados antiguos con alguien que ya no está en el equipo (se pueden releer)
  const conMensajes = await db.mensajeEquipo.findMany({
    where: { canal: { startsWith: "privado:", contains: yo.id } },
    distinct: ["canal"],
    select: { canal: true },
  });
  const sueltos = conMensajes
    .map((c) => c.canal)
    .filter((canal) => !lista.some((c) => c.canal === canal));
  if (sueltos.length > 0) {
    const ids = sueltos
      .map((canal) => personasDelCanal(canal)?.find((id) => id !== yo.id))
      .filter(esId);
    const antiguos = await db.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, foto: true, rol: true, ultimaConexionEn: true },
    });
    for (const o of antiguos)
      lista.push({
        canal: canalDeRuta(o.id, yo.id)!,
        ruta: o.id,
        nombre: o.nombre,
        foto: o.foto,
        rol: o.rol,
        ultimaConexionEn: o.ultimaConexionEn,
        ultimo: null,
        noLeidos: 0,
      });
  }

  const canales = lista.map((c) => c.canal);
  const [noLeidos, ultimos] = await Promise.all([
    noLeidosPorCanal(yo, canales),
    // El último mensaje de cada chat (pocos chats: una consulta pequeña por cada uno)
    Promise.all(
      canales.map((canal) =>
        db.mensajeEquipo.findFirst({
          where: { canal },
          orderBy: { creadoEn: "desc" },
          select: {
            texto: true,
            autorNombre: true,
            autorId: true,
            creadoEn: true,
            imagenClave: true,
          },
        }),
      ),
    ),
  ]);

  const resultado = lista.map((c, i) => {
    const u = ultimos[i];
    return {
      ruta: c.ruta,
      nombre: c.nombre,
      foto: c.foto,
      rol: c.rol,
      ultimaConexionEn: c.ultimaConexionEn,
      noLeidos: noLeidos.get(c.canal) ?? 0,
      ultimo: u
        ? {
            texto: resumenMensaje(u.texto, !!u.imagenClave),
            autorNombre: u.autorNombre,
            mio: u.autorId === yo.id,
            creadoEn: u.creadoEn,
          }
        : null,
    };
  });
  const deGrupo = resultado.slice(0, grupos.length);
  const privados = resultado.slice(grupos.length);
  privados.sort((a, b) => {
    if (a.ultimo && b.ultimo) return b.ultimo.creadoEn.getTime() - a.ultimo.creadoEn.getTime();
    if (a.ultimo || b.ultimo) return a.ultimo ? -1 : 1;
    return a.nombre.localeCompare(b.nombre, "es");
  });
  return [...deGrupo, ...privados];
}

/**
 * Escribe un mensaje (el texto ya viene limpio y comprobado). Con `tarea`, es un aviso de tarea.
 * Devuelve la otra persona si es privado (para el aviso por correo).
 */
export async function escribirMensaje(
  yo: UsuarioActual,
  canal: string,
  texto: string,
  tarea: DatosTarea | null,
  imagen: ImagenGuardada | null = null,
) {
  const { otro, puedeEscribir } = await comprobarCanal(yo, canal);
  if (!puedeEscribir) throw new ErrorMensaje("Esta persona ya no está en el equipo.");

  // El responsable tiene que poder ver el chat: en uno privado, una de sus dos personas; en un
  // grupo, alguien de ese grupo
  let responsable: { id: string; nombre: string } | null = null;
  if (tarea?.responsableId) {
    if (tarea.responsableId === yo.id) responsable = { id: yo.id, nombre: yo.nombre };
    else if (otro && tarea.responsableId === otro.id) responsable = otro;
    else if (!otro) {
      const persona = await db.usuario.findUnique({
        where: { id: tarea.responsableId },
        select: { id: true, nombre: true, rol: true, tambienEditor: true, tambienHardware: true },
      });
      if (persona && grupoDe(canal)?.esMiembro(persona))
        responsable = { id: persona.id, nombre: persona.nombre };
    }
    if (!responsable) throw new ErrorMensaje("Esa persona no puede ver este chat.");
  }

  // Para el aviso por correo: ¿la otra persona ya tenía algo sin leer de este chat?
  const yaTeniaSinLeer = otro ? await teniaSinLeer(otro.id, canal, yo.id) : true;
  await db.mensajeEquipo.create({
    data: {
      canal,
      autorId: yo.id,
      autorNombre: yo.nombre,
      texto,
      ...(imagen && {
        imagenClave: imagen.clave,
        imagenAncho: imagen.ancho,
        imagenAlto: imagen.alto,
      }),
      ...(tarea && {
        esTarea: true,
        prioridad: tarea.prioridad,
        entregaEn: tarea.entregaEn,
        recordarEn: tarea.recordarEn,
        responsableId: responsable?.id ?? null,
        responsableNombre: responsable?.nombre ?? null,
      }),
    },
  });
  await marcarLeido(yo, canal);
  return { otro, yaTeniaSinLeer, responsable };
}

async function teniaSinLeer(usuarioId: string, canal: string, autorId: string) {
  const lectura = await db.lecturaCanal.findUnique({
    where: { usuarioId_canal: { usuarioId, canal } },
    select: { leidoHasta: true },
  });
  const pendiente = await db.mensajeEquipo.findFirst({
    where: { canal, autorId, creadoEn: { gt: lectura?.leidoHasta ?? new Date(0) } },
    select: { id: true },
  });
  return !!pendiente;
}

/** Busca un mensaje y comprueba que «yo» puede verlo */
async function mensajeVisible(yo: UsuarioActual, mensajeId: string) {
  if (!esId(mensajeId)) throw new ErrorMensaje("Ese mensaje no existe.");
  const mensaje = await db.mensajeEquipo.findUnique({
    where: { id: mensajeId },
    select: {
      id: true,
      canal: true,
      autorId: true,
      esTarea: true,
      responsableId: true,
      imagenClave: true,
    },
  });
  if (!mensaje) throw new ErrorMensaje("Ese mensaje no existe.");
  await comprobarCanal(yo, mensaje.canal);
  return mensaje;
}

async function tareaVisible(yo: UsuarioActual, mensajeId: string) {
  const mensaje = await mensajeVisible(yo, mensajeId);
  if (!mensaje.esTarea) throw new ErrorMensaje("Ese mensaje no es una tarea.");
  return mensaje;
}

/** Cambia el estado de una tarea (por hacer, en curso, hecha). Cualquiera que vea el chat puede */
export async function cambiarEstadoTarea(yo: UsuarioActual, mensajeId: string, estado: Estado) {
  const tarea = await tareaVisible(yo, mensajeId);
  await db.mensajeEquipo.update({
    where: { id: tarea.id },
    data: {
      estadoTarea: estado,
      ...(estado === "HECHA"
        ? { hechaEn: new Date(), hechaPor: yo.nombre }
        : { hechaEn: null, hechaPor: null }),
    },
  });
}

/** Cambia la prioridad de una tarea (o se la quita con null) */
export async function cambiarPrioridad(
  yo: UsuarioActual,
  mensajeId: string,
  prioridad: Prioridad | null,
) {
  const tarea = await tareaVisible(yo, mensajeId);
  await db.mensajeEquipo.update({ where: { id: tarea.id }, data: { prioridad } });
}

/** ¿Es «yo» quien recibe la alarma? El responsable o, si no hay, quien la escribió */
const recibeAlarma = (
  yo: UsuarioActual,
  t: { responsableId: string | null; autorId: string | null },
) => (t.responsableId ? t.responsableId === yo.id : t.autorId === yo.id);

/** Pospone la alarma unos minutos (vuelve a sonar y a mandar el correo) */
export async function posponerAlarma(yo: UsuarioActual, mensajeId: string, minutos: number) {
  const tarea = await tareaVisible(yo, mensajeId);
  if (!recibeAlarma(yo, tarea)) throw new ErrorMensaje("Esta alarma no es tuya.");
  await db.mensajeEquipo.update({
    where: { id: tarea.id },
    data: {
      recordarEn: new Date(Date.now() + minutos * 60_000),
      alarmaCerradaEn: null,
      recordatorioEnviadoEn: null,
    },
  });
}

/** Cierra la alarma (la tarea sigue igual; solo deja de sonar) */
export async function cerrarAlarma(yo: UsuarioActual, mensajeId: string) {
  const tarea = await tareaVisible(yo, mensajeId);
  if (!recibeAlarma(yo, tarea)) throw new ErrorMensaje("Esta alarma no es tuya.");
  await db.mensajeEquipo.update({ where: { id: tarea.id }, data: { alarmaCerradaEn: new Date() } });
}

/** Los canales que «yo» puede ver, como filtro: sus grupos y sus chats privados */
const filtroMisCanales = (yo: UsuarioActual) => ({
  OR: [
    { canal: { in: gruposDe(yo).map((g) => g.canal) } },
    { canal: { startsWith: "privado:", contains: yo.id } },
  ],
});

/** Las alarmas que tienen que sonarme ya */
export async function misAlarmas(yo: UsuarioActual) {
  if (!esDelEquipo(yo.rol)) return [];
  const tareas = await db.mensajeEquipo.findMany({
    where: {
      esTarea: true,
      estadoTarea: { not: "HECHA" },
      recordarEn: { lte: new Date() },
      alarmaCerradaEn: null,
      OR: [{ responsableId: yo.id }, { responsableId: null, autorId: yo.id }],
      AND: [filtroMisCanales(yo)],
    },
    select: {
      id: true,
      canal: true,
      texto: true,
      prioridad: true,
      entregaEn: true,
      autorNombre: true,
    },
    orderBy: { recordarEn: "asc" },
    take: 10,
  });
  return tareas.map((t) => ({ ...t, ruta: rutaDeCanal(t.canal, yo.id) }));
}

/**
 * El último mensaje que me han escrito y aún no he leído (para la tarjeta «Nuevo mensaje de…» y
 * el sonido). null si lo tengo todo leído.
 */
export async function ultimoSinLeer(yo: UsuarioActual) {
  if (!esDelEquipo(yo.rol)) return null;
  const [recientes, lecturas] = await Promise.all([
    db.mensajeEquipo.findMany({
      where: { AND: [filtroMisCanales(yo), { NOT: { autorId: yo.id } }] },
      select: {
        id: true,
        canal: true,
        texto: true,
        autorNombre: true,
        creadoEn: true,
        imagenClave: true,
      },
      orderBy: { creadoEn: "desc" },
      take: 20,
    }),
    db.lecturaCanal.findMany({
      where: { usuarioId: yo.id },
      select: { canal: true, leidoHasta: true },
    }),
  ]);
  const leido = new Map(lecturas.map((l) => [l.canal, l.leidoHasta.getTime()]));
  const m = recientes.find((r) => r.creadoEn.getTime() > (leido.get(r.canal) ?? 0));
  if (!m) return null;
  return {
    id: m.id,
    de: m.autorNombre,
    texto: resumenMensaje(m.texto, !!m.imagenClave).slice(0, 140),
    ruta: rutaDeCanal(m.canal, yo.id),
  };
}

/** La dirección /mensajes/<ruta> de un canal para «yo» */
export function rutaDeCanal(canal: string, miId: string): string {
  const personas = personasDelCanal(canal);
  if (!personas) return grupoDe(canal) ? canal : CANAL_GENERAL;
  return personas[0] === miId ? personas[1] : personas[0];
}

/**
 * Manda por correo los recordatorios que ya tocan (una vez cada uno). Se llama cada vez que alguien
 * del equipo tiene la web abierta (el contador del menú), así no hace falta una tarea programada.
 * Devuelve a quién hay que escribir; el correo lo manda quien llama.
 */
export async function recordatoriosPorEnviar() {
  const ahora = new Date();
  const tareas = await db.mensajeEquipo.findMany({
    where: {
      esTarea: true,
      estadoTarea: { not: "HECHA" },
      recordarEn: { lte: ahora },
      recordatorioEnviadoEn: null,
    },
    select: {
      id: true,
      canal: true,
      texto: true,
      entregaEn: true,
      prioridad: true,
      autorId: true,
      autorNombre: true,
      responsableId: true,
    },
    take: 20,
  });
  const listos = [];
  for (const t of tareas) {
    // Se «reserva» antes de mandarlo: si dos personas abren la web a la vez, solo sale uno
    const { count } = await db.mensajeEquipo.updateMany({
      where: { id: t.id, recordatorioEnviadoEn: null },
      data: { recordatorioEnviadoEn: ahora },
    });
    const destinoId = t.responsableId ?? t.autorId;
    if (count === 0 || !destinoId) continue;
    const destino = await db.usuario.findUnique({
      where: { id: destinoId },
      select: { email: true, nombre: true, rol: true, tambienEditor: true, tambienHardware: true },
    });
    if (!destino || !esDelEquipo(destino.rol)) continue;
    // En un grupo, solo si sigue en él (p. ej. ya no es de hardware)
    const grupo = grupoDe(t.canal);
    if (grupo && !grupo.esMiembro(destino)) continue;
    listos.push({ ...t, destino, destinoId, ruta: rutaDeCanal(t.canal, destinoId) });
  }
  return listos;
}

export interface TareaEnLista extends Mensaje {
  ruta: string;
  chat: string;
}

/** Todas las tareas que «yo» puede ver (de sus grupos y de sus chats privados), con el nombre del chat */
export async function listarTareas(yo: UsuarioActual): Promise<TareaEnLista[]> {
  if (!esDelEquipo(yo.rol)) return [];
  const tareas = await db.mensajeEquipo.findMany({
    where: { esTarea: true, ...filtroMisCanales(yo) },
    select: { ...camposMensaje, canal: true },
    orderBy: { creadoEn: "desc" },
    take: 500,
  });
  const otrosIds = [...new Set(tareas.map((t) => rutaDeCanal(t.canal, yo.id)).filter(esId))];
  const personas = await db.usuario.findMany({
    where: { id: { in: otrosIds } },
    select: { id: true, nombre: true },
  });
  const nombres = new Map(personas.map((p) => [p.id, p.nombre]));
  return tareas.map(({ canal, ...t }) => {
    const ruta = rutaDeCanal(canal, yo.id);
    return {
      ...aMensaje(t),
      ruta,
      chat: grupoDe(ruta)?.nombre ?? nombres.get(ruta) ?? "—",
    };
  });
}

/** Borra un mensaje: el suyo, cada uno; en un grupo, un administrador también puede borrar cualquiera */
export async function borrarMensaje(yo: UsuarioActual, mensajeId: string) {
  const mensaje = await mensajeVisible(yo, mensajeId);
  const puede =
    mensaje.autorId === yo.id || (!!grupoDe(mensaje.canal) && tieneAccesoAdmin(yo.rol));
  if (!puede) throw new ErrorMensaje("Solo puedes borrar tus mensajes.");
  await db.mensajeEquipo.delete({ where: { id: mensaje.id } });
  // La imagen también se borra del almacén (si falla, el mensaje ya no existe y nadie puede verla)
  if (mensaje.imagenClave) {
    await borrarPrivado(mensaje.imagenClave).catch((error) =>
      console.error("[mensajes] No se ha podido borrar una imagen del almacén.", error),
    );
  }
  return mensaje.canal;
}

/**
 * La clave de la imagen de un mensaje, si «yo» puede ver ese chat (si no, null: la ruta da 404).
 * Sirve tanto para el General como para los privados: mismas reglas que leer los mensajes.
 */
export async function imagenVisible(yo: UsuarioActual, mensajeId: string) {
  try {
    const mensaje = await mensajeVisible(yo, mensajeId);
    return mensaje.imagenClave;
  } catch (error) {
    if (error instanceof ErrorMensaje) return null;
    throw error;
  }
}

/**
 * La «huella» de un chat: cambia cuando llega o se borra un mensaje, cuando cambia una tarea o
 * cuando hay algo nuevo en otro chat (el número sin leer). El chat abierto la pide cada pocos
 * segundos y solo recarga si cambia: casi al momento y sin pedir la página entera cada vez.
 */
export async function huellaChat(yo: UsuarioActual, ruta: string): Promise<string | null> {
  const canal = canalDeRuta(ruta, yo.id);
  if (!canal) return null;
  try {
    await comprobarCanal(yo, canal);
  } catch (error) {
    if (error instanceof ErrorMensaje) return null;
    throw error;
  }
  const [cuantos, ultimo, tareas, sinLeer, leidos] = await Promise.all([
    db.mensajeEquipo.count({ where: { canal } }),
    db.mensajeEquipo.findFirst({
      where: { canal },
      orderBy: { creadoEn: "desc" },
      select: { id: true },
    }),
    db.mensajeEquipo.findMany({
      where: { canal, esTarea: true },
      select: { estadoTarea: true, prioridad: true, hechaEn: true },
      orderBy: { creadoEn: "desc" },
      take: MENSAJES_POR_CHAT,
    }),
    totalNoLeidos(yo),
    leidosDeLosMios(yo, canal),
  ]);
  const estados = tareas
    .map((t) => `${t.estadoTarea[0]}${t.prioridad?.[0] ?? "-"}${t.hechaEn?.getTime() ?? ""}`)
    .join("");
  return createHash("sha1")
    .update(`${cuantos}.${ultimo?.id ?? ""}.${sinLeer}.${estados}.${leidos}`)
    .digest("base64url")
    .slice(0, 16);
}

/**
 * Para la huella: cuántos de MIS últimos mensajes ha leído cada una de las otras personas. Solo
 * cambia cuando alguien lee algo mío (los tics se ponen azules), no cada vez que abre el chat:
 * así dos personas con el mismo chat abierto no se recargan la una a la otra sin parar.
 */
async function leidosDeLosMios(yo: UsuarioActual, canal: string): Promise<string> {
  const mios = await db.mensajeEquipo.findMany({
    where: { canal, autorId: yo.id },
    select: { creadoEn: true },
    orderBy: { creadoEn: "desc" },
    take: MENSAJES_POR_CHAT,
  });
  if (mios.length === 0) return "";
  const lecturas = await db.lecturaCanal.findMany({
    where: { canal, NOT: { usuarioId: yo.id } },
    select: { usuarioId: true, leidoHasta: true },
    orderBy: { usuarioId: "asc" },
  });
  return lecturas
    .map((l) => `${l.usuarioId.slice(-6)}:${mios.filter((m) => m.creadoEn <= l.leidoHasta).length}`)
    .join(",");
}
