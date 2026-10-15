/**
 * LÍMITE DE INTENTOS
 * Evita que alguien pruebe miles de contraseñas o códigos seguidos.
 * Cuenta los intentos de cada "clave" (por ejemplo, la IP + el email) en una
 * ventana de tiempo y, si se pasa del máximo, los bloquea hasta que caduquen.
 *
 * Se guarda en la memoria del servidor: es suficiente con un solo servidor.
 * Si algún día hay varios servidores, habría que guardarlo en un sitio compartido
 * (por ejemplo Redis); basta con cambiar este archivo.
 */
import "server-only";
import { headers } from "next/headers";

/** Límites de cada acción. Cámbialos aquí. */
export const LIMITES = {
  login: { maximo: 10, minutos: 15 },
  registro: { maximo: 5, minutos: 60 },
  activar: { maximo: 15, minutos: 15 },
  consultarCodigo: { maximo: 40, minutos: 15 },
  /** Cambiar la contraseña desde "Mi cuenta" (por usuario) */
  cambiarContrasena: { maximo: 5, minutos: 15 },
  /** Pedir un código de "¿Olvidaste tu contraseña?" (por IP; además, máximo 5 códigos por email y hora) */
  recuperar: { maximo: 10, minutos: 15 },
} as const;

export type AccionLimitada = keyof typeof LIMITES;

const intentos = new Map<string, number[]>();

/**
 * Apunta un intento y dice si está permitido.
 * Devuelve false si ya se ha superado el máximo en la ventana de tiempo.
 */
export function registrarIntento(accion: AccionLimitada, clave: string): boolean {
  const { maximo, minutos } = LIMITES[accion];
  const ahora = Date.now();
  const desde = ahora - minutos * 60_000;
  const id = `${accion}:${clave}`;

  const recientes = (intentos.get(id) ?? []).filter((momento) => momento > desde);
  if (recientes.length >= maximo) {
    intentos.set(id, recientes);
    return false;
  }
  recientes.push(ahora);
  intentos.set(id, recientes);

  // Limpieza de vez en cuando para que la memoria no crezca sin fin
  if (intentos.size > 5000) {
    for (const [otraClave, momentos] of intentos) {
      if (momentos.every((m) => m <= desde)) intentos.delete(otraClave);
    }
  }
  return true;
}

/** La IP que aparece en las cabeceras de una petición (o "local" si no se conoce) */
export function ipDeCabeceras(cabeceras: Headers): string {
  return (
    cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() || cabeceras.get("x-real-ip") || "local"
  );
}

/** La IP de quien hace la petición actual (en páginas y acciones del servidor) */
export async function ipDelCliente(): Promise<string> {
  return ipDeCabeceras(await headers());
}
