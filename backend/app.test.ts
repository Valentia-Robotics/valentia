/** La API de guiones automáticos (n8n), con la base de datos simulada. Es el mismo código que usa la web. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const simulado = vi.hoisted(() => ({
  crearGuion: vi.fn(),
  categoriasGuion: vi.fn(),
  registrarIntento: vi.fn(),
  kit: { findUnique: vi.fn() },
  noticiaUsada: { findUnique: vi.fn() },
}));

vi.mock("@/lib/contenido/guiones", () => ({
  crearGuion: simulado.crearGuion,
  categoriasGuion: simulado.categoriasGuion,
}));
vi.mock("@/lib/db", () => ({
  db: { kit: simulado.kit, noticiaUsada: simulado.noticiaUsada },
}));
// Solo se simula registrarIntento: LIMITES e ipDeCabeceras son los de verdad
vi.mock("@/lib/limite", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/limite")>()),
  registrarIntento: simulado.registrarIntento,
}));

import { app } from "./app";

const CLAVE = "clave-de-prueba-con-mas-de-32-caracteres";
const ROBOTICA = "6ad5f9ba06cf870884abee1c";
const IA = "6ad5f9ba06cf870884abee1e";
const NUEVO = "6ad5f9ba06cf870884abee1d";

const guion = {
  titulo: "Robot que dobla ropa",
  gancho: "¿Y si tu robot doblara la ropa?",
  duracionSegundos: 50,
  escenas: [
    {
      orden: 2,
      duracionSegundos: 40,
      voz: "Así funciona.",
      visual: "Brazo doblando",
      textoPantalla: "2 min",
    },
    {
      orden: 1,
      duracionSegundos: 10,
      voz: "Mira esto.",
      visual: "Primer plano",
    },
  ],
  cierreCta: "Monta el tuyo con Valentia.",
  hashtags: ["#robotica", "ia", "ia"],
  datosAVerificar: ["Tarda 2 minutos por prenda"],
  relevancia: 8,
  textoCompleto: "Mira esto. Así funciona.",
  fuente: {
    titulo: "Un robot dobla ropa",
    url: "https://www.xataka.com/robot-ropa?utm_source=rss#arriba",
    fecha: "2026-11-06T08:00:00Z",
  },
  origen: "n8n",
  modelo: "claude-sonnet-5-5",
  generadoEn: "2026-11-06T08:01:00Z",
};

const enviar = (cuerpo: unknown, clave: string | null = CLAVE) =>
  app.request("/api/guiones/automaticos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(clave ? { "x-api-key": clave } : {}),
    },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });

const errorDe = async (respuesta: Response) =>
  ((await respuesta.json()) as { error: string }).error;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("N8N_API_KEY", CLAVE);
  simulado.categoriasGuion.mockResolvedValue([
    { id: IA, nombre: "Inteligencia Artificial" },
    { id: ROBOTICA, nombre: "Robótica" },
  ]);
  simulado.noticiaUsada.findUnique.mockResolvedValue(null);
  simulado.kit.findUnique.mockResolvedValue(null);
  simulado.registrarIntento.mockResolvedValue(true);
  simulado.crearGuion.mockResolvedValue({ id: NUEVO });
});

describe("clave x-api-key", () => {
  it("sin clave o con otra: 401, y no se crea nada", async () => {
    expect((await enviar(guion, null)).status).toBe(401);
    expect((await enviar(guion, "x".repeat(40))).status).toBe(401);
    expect(simulado.crearGuion).not.toHaveBeenCalled();
  });

  it("sin N8N_API_KEY en el servidor (o demasiado corta) la API está cerrada: 503", async () => {
    vi.stubEnv("N8N_API_KEY", "");
    expect((await enviar(guion, null)).status).toBe(503);
    vi.stubEnv("N8N_API_KEY", "corta");
    expect((await enviar(guion, "corta")).status).toBe(503);
  });

  it("ping comprueba la clave sin crear nada", async () => {
    const pedir = (clave?: string) =>
      app.request("/api/guiones/automaticos/ping", {
        headers: clave ? { "x-api-key": clave } : {},
      });
    expect((await pedir()).status).toBe(401);
    const bien = await pedir(CLAVE);
    expect(bien.status).toBe(200);
    expect(await bien.json()).toEqual({ ok: true });
    expect(simulado.registrarIntento).not.toHaveBeenCalled();
  });

  it("el Health Check no pide clave", async () => {
    expect((await app.request("/health")).status).toBe(200);
  });
});

describe("crear", () => {
  it("201 con el id: pendiente de aprobación, sin editor y con origen IA", async () => {
    const respuesta = await enviar(guion);
    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ id: NUEVO });

    const [datos, autor, origen, extra] = simulado.crearGuion.mock.calls[0];
    expect(autor).toEqual({ id: null, nombre: "n8n" });
    expect(origen).toBe("IA");
    expect(extra.estado).toBe("PENDIENTE_APROBACION");
    expect(datos).not.toHaveProperty("editorId");
    // Campos de siempre, rellenados con lo que trae la IA
    expect(datos).toMatchObject({
      categoriaId: ROBOTICA,
      plataforma: "VIDEO_CORTO",
      duracionObjetivo: "50 segundos",
      gancho: guion.gancho,
      desarrollo: guion.textoCompleto,
      llamadaAccion: guion.cierreCta,
      kitId: null,
    });
    expect(datos.notasVisuales).toBe("1. Primer plano\n2. Brazo doblando");
  });

  it("guarda escenas en orden, fuente, hashtags limpios y la URL normalizada", async () => {
    await enviar(guion);
    const { automatico, urlNoticia } = simulado.crearGuion.mock.calls[0][3];
    expect(automatico.escenas.map((e: { orden: number }) => e.orden)).toEqual([
      1, 2,
    ]);
    expect(automatico.fuente).toMatchObject({
      medio: "xataka.com",
      url: guion.fuente.url,
    });
    expect(automatico.hashtags).toEqual(["robotica", "ia"]);
    expect(automatico.relevancia).toBe(8);
    expect(automatico.datosAVerificar).toEqual(guion.datosAVerificar);
    expect(urlNoticia).toBe("https://www.xataka.com/robot-ropa");
  });

  it("quita el HTML del texto", async () => {
    await enviar({
      ...guion,
      titulo: '<script>alert("x")</script>Robot <b>listo</b>',
    });
    expect(simulado.crearGuion.mock.calls[0][0].titulo).toBe(
      'alert("x")Robot listo',
    );
  });

  it("acepta una categoría por nombre, sin importar tildes", async () => {
    await enviar({ ...guion, categoria: "inteligencia artificial" });
    expect(simulado.crearGuion.mock.calls[0][0].categoriaId).toBe(IA);
  });

  it("solo con lo mínimo (titulo, una escena y fuente.url) también vale", async () => {
    const minimo = {
      titulo: "Mínimo",
      escenas: [{ voz: "Hola" }],
      fuente: { url: "https://ejemplo.com/n" },
    };
    expect((await enviar(minimo)).status).toBe(201);
    const datos = simulado.crearGuion.mock.calls[0][0];
    expect(datos).toMatchObject({
      gancho: "Hola",
      desarrollo: "Hola",
      llamadaAccion: "Sin indicar",
    });
  });
});

describe("errores", () => {
  it("400 con un mensaje claro si falta titulo, escenas o fuente.url", async () => {
    const sin = (campo: keyof typeof guion) => {
      const copia: Partial<typeof guion> = { ...guion };
      delete copia[campo];
      return copia;
    };
    const sinTitulo = await enviar(sin("titulo"));
    expect(sinTitulo.status).toBe(400);
    expect(await errorDe(sinTitulo)).toContain("título");

    const sinEscenas = await enviar({ ...guion, escenas: [] });
    expect(sinEscenas.status).toBe(400);
    expect(await errorDe(sinEscenas)).toContain("escena");

    const sinFuente = await enviar(sin("fuente"));
    expect(sinFuente.status).toBe(400);
    expect(await errorDe(sinFuente)).toContain("fuente.url");

    const urlMala = await enviar({
      ...guion,
      fuente: { url: "javascript:alert(1)" },
    });
    expect(urlMala.status).toBe(400);
    expect(simulado.crearGuion).not.toHaveBeenCalled();
  });

  it("409 si la noticia ya dio un guion (aunque cambie el #ancla o el utm)", async () => {
    simulado.noticiaUsada.findUnique.mockResolvedValue({ guionId: NUEVO });
    const respuesta = await enviar(guion);
    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toMatchObject({ id: NUEVO });
    expect(simulado.noticiaUsada.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { url: "https://www.xataka.com/robot-ropa" },
      }),
    );
    expect(simulado.crearGuion).not.toHaveBeenCalled();
  });

  it("429 pasado el límite de peticiones", async () => {
    simulado.registrarIntento.mockResolvedValue(false);
    expect((await enviar(guion)).status).toBe(429);
    expect(simulado.crearGuion).not.toHaveBeenCalled();
  });

  it("400 si no es JSON o no es un objeto; 413 si pasa de 200 KB", async () => {
    expect((await enviar("esto no es json")).status).toBe(400);
    expect((await enviar([guion])).status).toBe(400);
    expect(
      (await enviar({ ...guion, textoCompleto: "x".repeat(210_000) })).status,
    ).toBe(413);
  });
});
