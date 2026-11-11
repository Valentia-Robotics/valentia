/**
 * Fotos del panel (kits y componentes): sin bucket público, van al almacén privado y se siguen
 * viendo en /subidas/…, así no se pierden cuando el disco del servidor se vacía al publicar.
 */
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let privado: string;
let disco: string;
let modulo: typeof import("./publicoEnPrivado");
let almacen: typeof import("./index");
let ruta: typeof import("@/app/subidas/[...ruta]/route");

beforeAll(async () => {
  privado = await mkdtemp(path.join(os.tmpdir(), "fotos-privado-"));
  disco = await mkdtemp(path.join(os.tmpdir(), "fotos-disco-"));
  vi.stubEnv("ALMACEN_PRIVADO_CARPETA", privado);
  vi.stubEnv("ALMACEN_PRIVADO_BUCKET", "");
  vi.stubEnv("ALMACEN_PROVEEDOR", "local");
  vi.stubEnv("ALMACEN_LOCAL_CARPETA", "");
  vi.stubEnv("RENDER", "true");
  modulo = await import("./publicoEnPrivado");
  almacen = await import("./index");
  ruta = await import("@/app/subidas/[...ruta]/route");
});

afterEach(() => {
  vi.stubEnv("ALMACEN_PROVEEDOR", "local");
  vi.stubEnv("ALMACEN_LOCAL_CARPETA", "");
  vi.stubEnv("RENDER", "true");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(privado, { recursive: true, force: true });
  await rm(disco, { recursive: true, force: true });
});

async function fotoDePrueba() {
  const png = await sharp({
    create: { width: 300, height: 200, channels: 3, background: "#2D4BFF" },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(png)], "kit.png", { type: "image/png" });
}

const pedir = (relativa: string) =>
  ruta.GET(new Request("http://localhost/subidas/" + relativa), {
    params: Promise.resolve({ ruta: relativa.split("/") }),
  });

describe("qué almacén se usa", () => {
  it("en Render sin bucket público ni disco propio: el privado", () => {
    expect(modulo.usarAlmacenPrivadoParaFotos()).toBe(true);
  });
  it("con bucket público o con disco propio: no", () => {
    vi.stubEnv("ALMACEN_PROVEEDOR", "nube");
    expect(modulo.usarAlmacenPrivadoParaFotos()).toBe(false);
    vi.stubEnv("ALMACEN_PROVEEDOR", "local");
    vi.stubEnv("ALMACEN_LOCAL_CARPETA", disco);
    expect(modulo.usarAlmacenPrivadoParaFotos()).toBe(false);
  });
  it("en local sin bucket privado: el disco de siempre", () => {
    vi.stubEnv("RENDER", "");
    expect(modulo.usarAlmacenPrivadoParaFotos()).toBe(false);
  });
});

describe("claveFotoPublica", () => {
  it("solo acepta nombres del panel y siempre dentro de publicas/", () => {
    expect(modulo.claveFotoPublica("kits/mh3k2-0123456789ab.webp")).toBe(
      "publicas/kits/mh3k2-0123456789ab.webp",
    );
    for (const mala of [
      "../perfiles/mh3k2-0123456789ab.webp",
      "mensajes/mh3k2-0123456789ab.webp/../x",
      "kits/../../.env",
      "kits/foto.png",
      "mh3k2-0123456789ab.webp",
    ]) {
      expect(modulo.claveFotoPublica(mala)).toBeNull();
    }
  });
});

describe("subir, ver y borrar una foto de kit", () => {
  it("la dirección sigue siendo /subidas/… y la foto vive en el almacén privado", async () => {
    const url = await almacen.subirImagen(await fotoDePrueba(), "kits");
    expect(url).toMatch(/^\/subidas\/kits\/[a-z0-9]+-[a-f0-9]{12}\.webp$/);
    expect(await readdir(path.join(privado, "publicas", "kits"))).toHaveLength(1);

    const respuesta = await pedir(url.slice("/subidas/".length));
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("image/webp");
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    expect((await sharp(bytes).metadata()).format).toBe("webp");

    await almacen.borrarImagen(url);
    expect(await readdir(path.join(privado, "publicas", "kits"))).toHaveLength(0);
    expect((await pedir(url.slice("/subidas/".length))).status).toBe(404);
  });

  it("no deja leer por /subidas/ archivos del chat ni de hardware", async () => {
    expect((await pedir("../mensajes/mh3k2-0123456789ab.webp")).status).toBe(404);
    expect((await pedir("perfiles/../../x.webp")).status).toBe(404);
  });
});
