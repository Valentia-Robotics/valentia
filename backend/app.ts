/**
 * BACKEND DE VALENTIA: la API, separada de la web.
 * Todavía NO se publica: para pagar un solo servicio en Render, n8n llama a la ruta de la web
 * (frontend/src/app/api/v1/guiones). Este servidor será el de Render cuando la web pase a Vercel.
 * Las rutas viven aquí y la lógica en src/lib, para que panel y API sigan exactamente las mismas reglas.
 */
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { responderGuion, TAMANO_MAXIMO } from "@/lib/contenido/apiGuiones";
import { exigirToken } from "./token";

export const app = new Hono();

/** Para el Health Check de Render: no toca la base de datos ni pide token */
app.get("/health", (c) => c.json({ estado: "ok" }));

app.post(
  "/v1/guiones",
  exigirToken,
  bodyLimit({
    maxSize: TAMANO_MAXIMO,
    onError: (c) => c.json({ error: "El guion es demasiado grande." }, 413),
  }),
  async (c) => {
    const entrada = await c.req.json().catch(() => undefined);
    if (entrada === undefined) return c.json({ error: "El cuerpo no es JSON válido." }, 400);

    const { status, cuerpo } = await responderGuion(entrada);
    return c.json(cuerpo, status as 201 | 409 | 422);
  },
);

app.notFound((c) => c.json({ error: "No existe esa ruta." }, 404));

app.onError((error, c) => {
  // El detalle queda en los registros del servidor, nunca en la respuesta
  console.error("[backend]", error instanceof Error ? error.message : error);
  return c.json({ error: "Error interno." }, 500);
});
