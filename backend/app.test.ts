/** La API del backend, con la base de datos simulada */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const simulado = vi.hoisted(() => ({
  crearGuion: vi.fn(),
  categoriasGuion: vi.fn(),
  kit: { findUnique: vi.fn() },
  guion: { findFirst: vi.fn() },
}));

vi.mock("@/lib/contenido/guiones", () => ({
  crearGuion: simulado.crearGuion,
  categoriasGuion: simulado.categoriasGuion,
}));
vi.mock("@/lib/db", () => ({
  db: { kit: simulado.kit, guion: simulado.guion },
}));

import { app } from "./app";

const TOKEN = "token-de-prueba-con-mas-de-32-caracteres";
const CATEGORIA = "6ad5f9ba06cf870884abee1c";

const guion = {
  titulo: "El robot que aprendió a andar solo",
  categoria: "Robótica",
  plataforma: "VIDEO_CORTO",
  duracionObjetivo: "45 segundos",
  gancho: "¿Y si tu robot aprendiera a andar sin que lo programes?",
  desarrollo: "Texto del guion.",
  llamadaAccion: "Monta el tuyo con Valentia.",
  notasVisuales: "Plano del robot andando.",
  fechaLimite: "2030-01-15",
};

const enviar = (cuerpo: unknown, token: string | null = TOKEN) =>
  app.request("/v1/guiones", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("N8N_API_TOKEN", TOKEN);
  simulado.categoriasGuion.mockResolvedValue([
    { id: CATEGORIA, nombre: "Robótica" },
  ]);
  simulado.guion.findFirst.mockResolvedValue(null);
  simulado.kit.findUnique.mockResolvedValue(null);
  simulado.crearGuion.mockResolvedValue({ id: "6ad5f9ba06cf870884abee1d" });
});

describe("token", () => {
  it("sin token, o con otro, no entra y no se crea nada", async () => {
    expect((await enviar(guion, null)).status).toBe(401);
    expect((await enviar(guion, "x".repeat(40))).status).toBe(401);
    expect(simulado.crearGuion).not.toHaveBeenCalled();
  });

  it("sin configurar en el servidor, la API está cerrada", async () => {
    vi.stubEnv("N8N_API_TOKEN", "");
    expect((await enviar(guion, null)).status).toBe(503);
    vi.stubEnv("N8N_API_TOKEN", "corto");
    expect((await enviar(guion, "corto")).status).toBe(503);
  });

  it("el Health Check no pide token", async () => {
    expect((await app.request("/health")).status).toBe(200);
  });
});

describe("crear guion", () => {
  it("un guion válido queda en borrador, con origen IA y sin dueño humano", async () => {
    const respuesta = await enviar(guion);
    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toMatchObject({ estado: "BORRADOR" });
    const [datos, autor, origen] = simulado.crearGuion.mock.calls[0];
    expect(datos).toMatchObject({ categoriaId: CATEGORIA, kitId: null });
    expect(autor).toEqual({ id: null, nombre: "n8n" });
    expect(origen).toBe("IA");
  });

  it("la categoría no distingue mayúsculas", async () => {
    expect((await enviar({ ...guion, categoria: "robótica" })).status).toBe(
      201,
    );
  });

  it("una categoría fuera de la lista se rechaza y dice cuáles valen", async () => {
    const respuesta = await enviar({ ...guion, categoria: "Cocina" });
    expect(respuesta.status).toBe(422);
    const { errores } = (await respuesta.json()) as {
      errores: Record<string, string>;
    };
    expect(errores.categoria).toContain("Robótica");
    expect(simulado.crearGuion).not.toHaveBeenCalled();
  });

  it("explica qué campo falta", async () => {
    const incompleto: Partial<typeof guion> = { ...guion };
    delete incompleto.gancho;
    const respuesta = await enviar(incompleto);
    expect(respuesta.status).toBe(422);
    const { errores } = (await respuesta.json()) as {
      errores: Record<string, string>;
    };
    expect(errores).toHaveProperty("gancho");
  });

  it("no se puede colar el estado ni el editor", async () => {
    await enviar({
      ...guion,
      estado: "APROBADO",
      editorId: CATEGORIA,
      origen: "MANUAL",
    });
    const [datos, , origen] = simulado.crearGuion.mock.calls[0];
    expect(datos).not.toHaveProperty("estado");
    expect(datos).not.toHaveProperty("editorId");
    expect(origen).toBe("IA");
  });

  it("un kit que no existe se rechaza; uno que existe se enlaza", async () => {
    expect((await enviar({ ...guion, kit: "no-existe" })).status).toBe(422);
    simulado.kit.findUnique.mockResolvedValue({ id: CATEGORIA });
    expect((await enviar({ ...guion, kit: "brazo-robotico" })).status).toBe(
      201,
    );
    expect(simulado.crearGuion.mock.calls[0][0].kitId).toBe(CATEGORIA);
  });

  it("si el cron repite la llamada, no se duplica", async () => {
    simulado.guion.findFirst.mockResolvedValue({
      id: "6ad5f9ba06cf870884abee1d",
    });
    expect((await enviar(guion)).status).toBe(409);
    expect(simulado.crearGuion).not.toHaveBeenCalled();
  });

  it("rechaza lo que no es un objeto JSON o es demasiado grande", async () => {
    expect((await enviar("esto no es json")).status).toBe(400);
    expect((await enviar([guion])).status).toBe(422);
    expect(
      (await enviar({ ...guion, desarrollo: "x".repeat(70_000) })).status,
    ).toBe(413);
  });
});
