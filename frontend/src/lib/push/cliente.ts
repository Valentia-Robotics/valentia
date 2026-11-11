/**
 * AVISOS PUSH EN EL NAVEGADOR (solo cliente): registrar el service worker (public/sw.js), pedir
 * permiso, apuntar este aparato en el servidor (/api/push) y saber en qué punto está.
 */

const CLAVE_APUNTADO = "valentia-push-apuntado";
const HORAS_REPASO = 12;

export type EstadoAvisos =
  /** Este navegador no sabe recibir avisos */
  | "no-hay"
  /** iPhone/iPad desde Safari: primero hay que añadir la web a la pantalla de inicio */
  | "instalar-ios"
  /** Se puede activar */
  | "apagado"
  /** Dijo que no: hay que cambiarlo en los ajustes del navegador */
  | "bloqueado"
  | "activado";

export const esIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // El iPad dice que es un Mac, pero tiene pantalla táctil
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1));

/** ¿Está abierta como app (desde el icono de la pantalla de inicio)? */
export const instalada = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

const hayPush = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  typeof Notification !== "undefined";

/** Registra el service worker (una vez; si ya está, devuelve el que hay) */
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (!hayPush()) return esIOS() && !instalada() ? "instalar-ios" : "no-hay";
  if (Notification.permission === "denied") return "bloqueado";
  const registro = await registrarServiceWorker();
  const suscripcion = await registro?.pushManager.getSubscription();
  return suscripcion && Notification.permission === "granted" ? "activado" : "apagado";
}

function bytesDeClave(texto: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (texto.length % 4)) % 4);
  const base64 = (texto + relleno).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function apuntar(suscripcion: PushSubscription) {
  const respuesta = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suscripcion: suscripcion.toJSON() }),
  });
  if (!respuesta.ok) throw new Error("El servidor no ha guardado el aparato.");
}

/**
 * Pide permiso y apunta este aparato. Tiene que llamarse al pulsar un botón (los navegadores
 * no dejan pedir permiso solos). Devuelve el estado final.
 */
export async function activarAvisos(miId: string): Promise<EstadoAvisos> {
  if (!hayPush()) return estadoAvisos();
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso === "denied" ? "bloqueado" : "apagado";
  const registro = await registrarServiceWorker();
  if (!registro) return "no-hay";
  const { clave } = (await (await fetch("/api/push", { cache: "no-store" })).json()) as {
    clave: string;
  };
  let suscripcion = await registro.pushManager.getSubscription();
  // Si se hizo con otras claves (p. ej. se cambiaron en Render), se rehace
  const actual = suscripcion?.options.applicationServerKey;
  if (suscripcion && actual) {
    const nueva = bytesDeClave(clave);
    const vieja = new Uint8Array(actual);
    if (vieja.length !== nueva.length || vieja.some((b, i) => b !== nueva[i])) {
      await suscripcion.unsubscribe();
      suscripcion = null;
    }
  }
  suscripcion ??= await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: bytesDeClave(clave),
  });
  await apuntar(suscripcion);
  try {
    localStorage.setItem(CLAVE_APUNTADO, `${miId}:${Date.now()}`);
  } catch {}
  return "activado";
}

export async function desactivarAvisos(): Promise<EstadoAvisos> {
  const registro = await registrarServiceWorker();
  const suscripcion = await registro?.pushManager.getSubscription();
  if (suscripcion) {
    await fetch("/api/push", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: suscripcion.endpoint }),
    }).catch(() => undefined);
    await suscripcion.unsubscribe();
  }
  return estadoAvisos();
}

/**
 * Si ya estaba activado, vuelve a apuntar el aparato de vez en cuando (por si se borró en el
 * servidor) y enseguida si ahora entra otra persona en este navegador (los avisos pasan a ser
 * suyos). Sin preguntar nada: el permiso ya estaba dado.
 */
export async function repasarAvisos(miId: string) {
  try {
    if ((await estadoAvisos()) !== "activado") return;
    const [quien, cuando] = (localStorage.getItem(CLAVE_APUNTADO) ?? "").split(":");
    if (quien === miId && Date.now() - Number(cuando ?? 0) < HORAS_REPASO * 3_600_000) return;
    const registro = await registrarServiceWorker();
    const suscripcion = await registro?.pushManager.getSubscription();
    if (!suscripcion) return;
    await apuntar(suscripcion);
    localStorage.setItem(CLAVE_APUNTADO, `${miId}:${Date.now()}`);
  } catch {
    // Ya se intentará otra vez
  }
}
