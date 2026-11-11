/*
 * SERVICE WORKER DE VALENTIA: recibe los avisos de los mensajes del equipo (Web Push) y los enseña
 * como notificaciones del móvil o del ordenador, aunque la web esté cerrada (como WhatsApp).
 * Lo registra src/components/mensajes/AvisosEquipo.tsx. No guarda páginas en caché: la web
 * funciona igual que sin él. Lo que manda el servidor: src/config/push.ts (AvisoPush).
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

// Apple (iPhone, iPad y Safari del Mac) quita el permiso si un aviso llega y no se enseña:
// allí se enseña siempre
const esApple = /iPhone|iPad|Macintosh/.test(self.navigator.userAgent) &&
  !/Chrome|CriOS|Firefox|FxiOS|Edg\//.test(self.navigator.userAgent);

self.addEventListener("push", (evento) => {
  let aviso;
  try {
    aviso = evento.data ? evento.data.json() : null;
  } catch {
    aviso = null;
  }
  aviso = aviso || { titulo: "Valentia", cuerpo: "Tienes un mensaje nuevo", url: "/mensajes" };

  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Las pestañas abiertas se ponen al día al momento (el chat y el número del menú)
      for (const v of ventanas) v.postMessage({ tipo: "aviso-push", ruta: aviso.ruta });

      // El número del icono de la app instalada
      if (typeof aviso.total === "number" && self.navigator.setAppBadge) {
        try {
          if (aviso.total > 0) await self.navigator.setAppBadge(aviso.total);
          else await self.navigator.clearAppBadge();
        } catch {
          // No todos los móviles lo tienen
        }
      }

      // Si ya estás mirando ese mismo chat, no hace falta molestar (salvo en Apple, ver arriba)
      const mirandoEseChat = ventanas.some(
        (v) => v.focused && v.visibilityState === "visible" && aviso.url &&
          new URL(v.url).pathname === aviso.url,
      );
      if (mirandoEseChat && !esApple) return;

      await self.registration.showNotification(aviso.titulo || "Valentia", {
        body: aviso.cuerpo || "",
        tag: aviso.etiqueta || "valentia",
        // Que vuelva a sonar y vibrar aunque ya hubiera uno del mismo chat
        renotify: true,
        requireInteraction: false,
        icon: "/images/brand/icono-192.png",
        badge: "/images/brand/insignia-96.png",
        vibrate: [200, 100, 200, 100, 200],
        timestamp: Date.now(),
        data: { url: aviso.url || "/mensajes" },
      });
    })(),
  );
});

// Al tocar el aviso: se abre el chat (en la pestaña o la app que ya estuviera abierta, si la hay)
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL((evento.notification.data && evento.notification.data.url) || "/mensajes",
    self.location.origin).href;
  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const propia = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (propia) {
        await propia.focus();
        if ("navigate" in propia) {
          try {
            await propia.navigate(url);
            return;
          } catch {
            // Algunas pestañas no se dejan mover: se abre otra
          }
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

/** La clave pública (texto base64url) como bytes: Safari no acepta el texto */
function bytesDeClave(texto) {
  const relleno = "=".repeat((4 - (texto.length % 4)) % 4);
  const base64 = (texto + relleno).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

// Si el navegador cambia la suscripción por su cuenta, se vuelve a apuntar sola
self.addEventListener("pushsubscriptionchange", (evento) => {
  evento.waitUntil(
    (async () => {
      try {
        const { clave } = await (await fetch("/api/push", { credentials: "include" })).json();
        const nueva = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytesDeClave(clave),
        });
        await fetch("/api/push", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suscripcion: nueva.toJSON() }),
        });
      } catch {
        // Al abrir la web la próxima vez se vuelve a intentar
      }
    })(),
  );
});
