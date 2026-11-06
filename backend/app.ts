/**
 * BACKEND DE VALENTIA (Render): la API, separada de la web.
 * Se irá ampliando módulo a módulo; de momento recibe los guiones que genera n8n.
 * Las rutas viven aquí y la lógica en src/lib, para que panel y API sigan exactamente las mismas reglas.
 */
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { recibirGuion } from "@/lib/contenido/recibirGuion";
import { exigirToken } from "./token";

/** Un guion es texto: 64 KB sobran */
const TAMANO_MAXIMO = 64 * 1024;

const urlPanel = (id: string) => {
  const web = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${web}/admin/contenido/${id}`;
};

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
    if (entrada === undefined)
      return c.json({ error: "El cuerpo no es JSON válido." }, 400);

    const resultado = await recibirGuion(entrada, "n8n");
    switch (resultado.estado) {
      case "creado":
        return c.json(
          {
            id: resultado.id,
            estado: "BORRADOR",
            panel: urlPanel(resultado.id),
          },
          201,
        );
      case "repetido":
        return c.json(
          {
            error:
              "Ya se creó un guion con este título en las últimas 24 horas.",
            id: resultado.id,
          },
          409,
        );
      case "invalido":
        return c.json(
          { error: "El guion no es válido.", errores: resultado.errores },
          422,
        );
    }
  },
);

app.notFound((c) => c.json({ error: "No existe esa ruta." }, 404));

app.onError((error, c) => {
  // El detalle queda en los registros del servidor, nunca en la respuesta
  console.error("[backend]", error instanceof Error ? error.message : error);
  return c.json({ error: "Error interno." }, 500);
});
