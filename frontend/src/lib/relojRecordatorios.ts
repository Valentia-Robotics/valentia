/**
 * EL «RELOJ» DE LOS RECORDATORIOS: cada minuto, el servidor se llama a sí mismo para mandar los
 * recordatorios de tareas que ya tocan (src/app/api/mensajes/recordatorios). Va por una petición
 * y no llamando a la función directamente porque aquí (instrumentation) no se puede usar la BD
 * de la web. En Render el servidor está siempre encendido, así que suena a su hora.
 * Con `next dev` no se enciende salvo con RECORDATORIOS_EN_DESARROLLO=si (para no llenar la consola).
 */
import { claveInterna } from "./claveInterna";

const CADA_MS = 60_000;

export function relojRecordatorios() {
  if (process.env.NODE_ENV !== "production" && process.env.RECORDATORIOS_EN_DESARROLLO !== "si")
    return;
  const clave = claveInterna("recordatorios");
  if (!clave) return;
  const direccion = `http://127.0.0.1:${process.env.PORT || "3000"}/api/mensajes/recordatorios`;
  let fallosSeguidos = 0;
  const tictac = async () => {
    try {
      const respuesta = await fetch(direccion, {
        method: "POST",
        headers: { "x-clave-interna": clave },
        signal: AbortSignal.timeout(30_000),
      });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      fallosSeguidos = 0;
    } catch (error) {
      // Solo se avisa una vez (p. ej. durante el arranque todavía no responde)
      if (++fallosSeguidos === 3) console.error("[recordatorios] El reloj no responde.", error);
    }
  };
  // Que no impida apagar el servidor
  setInterval(tictac, CADA_MS).unref?.();
}
