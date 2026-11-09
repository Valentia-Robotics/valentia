/**
 * EQUIPO (panel): la gente que trabaja en la web, agrupada por rol, con su última conexión.
 */
import "server-only";
import { ROLES_EQUIPO } from "@/config/equipo";
import { db } from "@/lib/db";

/** Para pedir con cada persona lo último que hizo con un dispositivo */
export const ultimoDispositivo = {
  select: { ultimoUsoEn: true },
  orderBy: { ultimoUsoEn: "desc" },
  take: 1,
} as const;

/**
 * La más reciente entre la conexión apuntada y el último uso de un dispositivo (este se apunta
 * como mucho cada hora, pero sirve para quien se conectó antes de que existiera la conexión).
 */
export function ultimaConexion(apuntada: Date | null, dispositivos: { ultimoUsoEn: Date }[]) {
  const deDispositivo = dispositivos[0]?.ultimoUsoEn ?? null;
  if (!apuntada) return deDispositivo;
  return deDispositivo && deDispositivo > apuntada ? deDispositivo : apuntada;
}

export async function obtenerEquipo() {
  const personas = await db.usuario.findMany({
    where: { rol: { in: ROLES_EQUIPO.map((r) => r.rol) } },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      ultimaConexionEn: true,
      dispositivos: ultimoDispositivo,
    },
  });

  const conConexion = personas.map(({ dispositivos, ...p }) => ({
    ...p,
    ultima: ultimaConexion(p.ultimaConexionEn, dispositivos),
  }));

  // Por rol (en el orden de ROLES_EQUIPO) y, dentro, el más reciente primero
  return ROLES_EQUIPO.map((r) => ({
    ...r,
    personas: conConexion
      .filter((p) => p.rol === r.rol)
      .sort((a, b) => (b.ultima?.getTime() ?? 0) - (a.ultima?.getTime() ?? 0)),
  }));
}
