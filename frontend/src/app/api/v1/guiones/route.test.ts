/** La ruta de n8n en la web, con la base de datos simulada */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const simulado = vi.hoisted(() => ({ recibirGuion: vi.fn() }));
vi.mock("@/lib/contenido/recibirGuion", () => ({ recibirGuion: simulado.recibirGuion }));

import { POST } from "./route";

const TOKEN = "token-de-prueba-con-mas-de-32-caracteres";

const enviar = (cuerpo: string, token: string | null = TOKEN) =>
  POST(
    new Request("http://localhost/api/v1/guiones", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: cuerpo,
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("N8N_API_TOKEN", TOKEN);
  simulado.recibirGuion.mockResolvedValue({ estado: "creado", id: "g1" });
});

describe("POST /api/v1/guiones", () => {
  it("sin token, o con otro, no llega a procesar nada", async () => {
    expect((await enviar("{}", null)).status).toBe(401);
    expect((await enviar("{}", "x".repeat(40))).status).toBe(401);
    expect(simulado.recibirGuion).not.toHaveBeenCalled();
  });

  it("sin configurar en el servidor, la API está cerrada", async () => {
    vi.stubEnv("N8N_API_TOKEN", "");
    expect((await enviar("{}", null)).status).toBe(503);
    vi.stubEnv("N8N_API_TOKEN", "corto");
    expect((await enviar("{}", "corto")).status).toBe(503);
    expect(simulado.recibirGuion).not.toHaveBeenCalled();
  });

  it("crea y devuelve el enlace al panel", async () => {
    const respuesta = await enviar('{"titulo":"x"}');
    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toMatchObject({ id: "g1", estado: "BORRADOR" });
    expect(simulado.recibirGuion).toHaveBeenCalledWith({ titulo: "x" }, "n8n");
  });

  it("explica los errores y los duplicados", async () => {
    simulado.recibirGuion.mockResolvedValue({ estado: "invalido", errores: { gancho: "Falta" } });
    const invalido = await enviar("{}");
    expect(invalido.status).toBe(422);
    expect(await invalido.json()).toMatchObject({ errores: { gancho: "Falta" } });
    simulado.recibirGuion.mockResolvedValue({ estado: "repetido", id: "g1" });
    expect((await enviar("{}")).status).toBe(409);
  });

  it("rechaza lo que no es JSON o es demasiado grande", async () => {
    expect((await enviar("esto no es json")).status).toBe(400);
    expect((await enviar(JSON.stringify({ d: "x".repeat(70_000) }))).status).toBe(413);
    expect(simulado.recibirGuion).not.toHaveBeenCalled();
  });
});
