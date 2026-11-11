"use server";

/**
 * ACCIONES DE LOS MENSAJES DEL EQUIPO
 * Quién puede hacer qué lo decide src/lib/mensajes/mensajes.ts según quién llama (nunca lo que
 * diga el navegador): aquí solo se comprueba la sesión, se limpia el texto y se avisa por correo.
 */
import { revalidatePath } from "next/cache";
import { esDelEquipo } from "@/config/equipo";
import {
  ESTADOS,
  MINUTOS_POSPONER,
  PRIORIDADES,
  type Estado,
  type Prioridad,
} from "@/config/mensajes";
import { enviarYAvisar, type TareaNueva } from "@/lib/mensajes/enviar";
import {
  borrarMensaje,
  cambiarEstadoTarea,
  cambiarPrioridad,
  cerrarAlarma,
  ErrorMensaje,
  posponerAlarma,
} from "@/lib/mensajes/mensajes";
import { obtenerUsuario, SinPermiso, type UsuarioActual } from "@/lib/sesion";

export interface Respuesta {
  ok: boolean;
  mensaje?: string;
}

/** Comprueba la sesión, hace la acción y traduce los errores a un mensaje para la pantalla */
async function conEquipo(hacer: (yo: UsuarioActual) => Promise<void>): Promise<Respuesta> {
  const yo = await obtenerUsuario();
  if (!yo || !esDelEquipo(yo.rol)) throw new SinPermiso();
  try {
    await hacer(yo);
  } catch (error) {
    if (error instanceof ErrorMensaje) return { ok: false, mensaje: error.message };
    throw error;
  }
  revalidatePath("/mensajes", "layout");
  return { ok: true };
}

/** Envía un mensaje (o una tarea, si llega `tarea`) al chat de la dirección /mensajes/<ruta> */
export async function enviarMensaje(
  ruta: string,
  texto: string,
  tarea: TareaNueva | null,
): Promise<Respuesta> {
  return conEquipo((yo) => enviarYAvisar(yo, ruta, texto, tarea));
}

export async function marcarEstadoTarea(mensajeId: string, estado: Estado): Promise<Respuesta> {
  return conEquipo(async (yo) => {
    if (!ESTADOS.some((e) => e.valor === estado)) throw new ErrorMensaje("Ese estado no existe.");
    await cambiarEstadoTarea(yo, String(mensajeId), estado);
  });
}

export async function marcarPrioridad(
  mensajeId: string,
  prioridad: Prioridad | null,
): Promise<Respuesta> {
  return conEquipo(async (yo) => {
    const valida = PRIORIDADES.some((p) => p.valor === prioridad) ? prioridad : null;
    await cambiarPrioridad(yo, String(mensajeId), valida);
  });
}

/** Pospone la alarma de una tarea (10 minutos o 1 hora) */
export async function posponer(mensajeId: string, minutos: number): Promise<Respuesta> {
  return conEquipo(async (yo) => {
    const valido = MINUTOS_POSPONER.find((m) => m === minutos) ?? MINUTOS_POSPONER[0];
    await posponerAlarma(yo, String(mensajeId), valido);
  });
}

export async function apagarAlarma(mensajeId: string): Promise<Respuesta> {
  return conEquipo((yo) => cerrarAlarma(yo, String(mensajeId)));
}

/** Borra un mensaje propio (o, si eres admin, cualquiera del General) */
export async function quitarMensaje(mensajeId: string): Promise<Respuesta> {
  return conEquipo(async (yo) => {
    await borrarMensaje(yo, String(mensajeId));
  });
}
