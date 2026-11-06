/**
 * Arranca el backend: «npm run backend» en desarrollo y «npm run backend:start» en Render.
 * Render indica el puerto en PORT; en tu ordenador es el 4000, para no chocar con la web (3000).
 */
import "./entorno";
import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.PORT ?? 4000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`[backend] Escuchando en el puerto ${port}`);
});
