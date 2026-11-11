/**
 * Fotos de perfil: se guardan en el almacén privado y se enseñan con /api/fotos-perfil/…,
 * así las ve todo el equipo aunque el disco del servidor se vacíe al publicar.
 */
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let carpeta: string;
let modulo: typeof import("./fotoPerfil");

beforeAll(async () => {
  carpeta = await mkdtemp(path.join(os.tmpdir(), "fotos-perfil-"));
  vi.stubEnv("ALMACEN_PRIVADO_CARPETA", carpeta);
  vi.stubEnv("ALMACEN_PRIVADO_BUCKET", "");
  modulo = await import("./fotoPerfil");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(carpeta, { recursive: true, force: true });
});

async function fotoDePrueba() {
  const png = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "#2D4BFF" },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(png)], "yo.png", { type: "image/png" });
}

describe("fotos de perfil", () => {
  it("se guarda en el almacén privado, cuadrada, y se borra", async () => {
    const url = await modulo.subirFotoPerfil(await fotoDePrueba());
    expect(url.startsWith(modulo.PREFIJO_FOTO_PERFIL)).toBe(true);

    const clave = modulo.claveFotoPerfil(url.slice(modulo.PREFIJO_FOTO_PERFIL.length));
    expect(clave).toMatch(/^perfiles\//);
    const guardada = path.join(carpeta, clave!);
    const { width, height, format } = await sharp(guardada).metadata();
    expect([width, height, format]).toEqual([256, 256, "webp"]);

    await modulo.borrarFotoPerfil(url);
    expect(await readdir(path.join(carpeta, "perfiles"))).toEqual([]);
  });

  it("no deja pedir otras rutas del almacén", () => {
    expect(modulo.claveFotoPerfil("../hardware/plano.pdf")).toBeNull();
    expect(modulo.claveFotoPerfil("mensajes%2Fabc.webp")).toBeNull();
    expect(modulo.claveFotoPerfil("abc.webp")).toBeNull();
    expect(modulo.claveFotoPerfil("mhb2k9x0-0123456789ab.webp")).toBe(
      "perfiles/mhb2k9x0-0123456789ab.webp",
    );
  });
});
