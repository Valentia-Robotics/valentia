/**
 * APP DEL MÓVIL: qué desbloquea cada kit
 * Al activar el código de un kit (en la web o en la app), la app enseña sus funciones.
 * Son DATOS: para añadir una función a un kit, añádela aquí (y su pantalla en la app, carpeta movil/).
 *
 *   disponible: false → la app la enseña como «Muy pronto» (aún no está hecha)
 */

export type IdFuncionApp = "control-remoto" | "datos-tiempo" | "mover-brazo" | "curso";

export interface FuncionApp {
  id: IdFuncionApp;
  titulo: string;
  descripcion: string;
  disponible: boolean;
}

const CURSO: FuncionApp = {
  id: "curso",
  titulo: "Tu curso",
  descripcion: "Vídeos, tests y retos paso a paso.",
  disponible: true,
};

/** Funciones de cada kit, por su slug. Un kit que no está aquí solo trae su curso. */
export const FUNCIONES_POR_KIT: Record<string, FuncionApp[]> = {
  "vr1-starter-kit": [
    {
      id: "control-remoto",
      titulo: "Control remoto",
      descripcion: "Conduce tu coche desde el móvil por Bluetooth o wifi.",
      disponible: true,
    },
    CURSO,
  ],
  "brazo-robotico": [
    {
      id: "mover-brazo",
      titulo: "Mueve el brazo",
      descripcion: "Mueve cada articulación y la pinza desde el móvil.",
      disponible: false,
    },
    CURSO,
  ],
  "estacion-meteorologica": [
    {
      id: "datos-tiempo",
      titulo: "El tiempo en tu móvil",
      descripcion: "Temperatura, humedad, presión y luz de tu estación, al momento.",
      disponible: false,
    },
    CURSO,
  ],
};

export function funcionesDeKit(slug: string): FuncionApp[] {
  return FUNCIONES_POR_KIT[slug] ?? [CURSO];
}

/** Días que dura la sesión de la app sin volver a pedir código (se alarga cada vez que se usa) */
export const DIAS_SESION_APP = 90;
