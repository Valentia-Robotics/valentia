/**
 * BACKEND DE VALENTIA: la API, separada de la web.
 * Todavía NO se publica: para pagar un solo servicio en Render, n8n llama a la web
 * (frontend/src/app/api/guiones/automaticos). Este servidor sería el de Render si la web pasara a Vercel.
 * Las dos entradas usan el mismo código (src/lib/contenido/guionesAutomaticos.ts) y las mismas rutas:
 * cambiar de una a otra solo cambia la dirección a la que llama n8n.
 */
import { Hono } from "hono";
import { crearDesdeN8n, ping } from "@/lib/contenido/guionesAutomaticos";

export const app = new Hono();

/** Para el Health Check de Render: no toca la base de datos ni pide clave */
app.get("/health", (c) => c.json({ estado: "ok" }));

app.get("/api/guiones/automaticos/ping", (c) => ping(c.req.raw));
app.post("/api/guiones/automaticos", (c) => crearDesdeN8n(c.req.raw));

app.notFound((c) => c.json({ error: "No existe esa ruta." }, 404));

app.onError((error, c) => {
  // El detalle queda en los registros del servidor, nunca en la respuesta
  console.error("[backend]", error instanceof Error ? error.message : error);
  return c.json({ error: "Error interno." }, 500);
});
