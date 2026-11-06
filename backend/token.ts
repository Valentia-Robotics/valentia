/** Token de la API: las reglas están en src/lib/contenido/apiGuiones.ts, compartidas con la web */
import type { MiddlewareHandler } from "hono";
import { comprobarToken } from "@/lib/contenido/apiGuiones";

export const exigirToken: MiddlewareHandler = async (c, siguiente) => {
  const rechazo = comprobarToken(c.req.header("authorization"));
  if (rechazo) return c.json(rechazo.cuerpo, rechazo.status as 401 | 503);
  await siguiente();
};
