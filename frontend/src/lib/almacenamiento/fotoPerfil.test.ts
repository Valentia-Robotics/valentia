/**
 * Fotos de perfil: se guardan en la base de datos (pequeñas) y se enseñan con /api/fotos-perfil/<id>,
 * así las ve todo el equipo sin depender de ningún almacén de archivos.
 */
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const guardadas = new Map<string, Uint8Array>();
let siguiente = 0;
vi.mock("@/lib/db", () => ({
  db: {
    fotoPerfil: {
      create: vi.fn(async ({ data }: { data: { datos: Uint8Array } }) => {
        const id = (++siguiente).toString(16).padStart(24, "a");
        guardadas.set(id, data.datos);
        return { id };
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: string } }) => {
        guardadas.delete(where.id);
        return { count: 1 };
      }),
    },
  },
}));
const borrarPrivado = vi.fn(async (clave: string) => void clave);
vi.mock("./privado", () => ({ borrarPrivado: (clave: string) => borrarPrivado(clave) }));

const { subirFotoPerfil, borrarFotoPerfil, leerRutaFoto, PREFIJO_FOTO_PERFIL, LADO_FOTO_PERFIL } =
  await import("./fotoPerfil");

beforeEach(() => guardadas.clear());

async function fotoDePrueba() {
  const png = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: "#2D4BFF" },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(png)], "yo.png", { type: "image/png" });
}

describe("fotos de perfil", () => {
  it("se guarda en la BD, cuadrada, pequeña, y se borra", async () => {
    const url = await subirFotoPerfil("0123456789abcdef01234567", await fotoDePrueba());
    expect(url.startsWith(PREFIJO_FOTO_PERFIL)).toBe(true);
    const ruta = leerRutaFoto(url.slice(PREFIJO_FOTO_PERFIL.length));
    expect(ruta?.tipo).toBe("bd");

    const datos = [...guardadas.values()][0];
    const { width, height, format } = await sharp(datos).metadata();
    expect([width, height, format]).toEqual([LADO_FOTO_PERFIL, LADO_FOTO_PERFIL, "webp"]);
    expect(datos.length).toBeLessThan(100_000);

    await borrarFotoPerfil(url);
    expect(guardadas.size).toBe(0);
  });

  it("las del almacén privado (antiguas) se siguen reconociendo y borrando", async () => {
    expect(leerRutaFoto("mhb2k9x0-0123456789ab.webp")).toEqual({
      tipo: "almacen",
      clave: "perfiles/mhb2k9x0-0123456789ab.webp",
    });
    await borrarFotoPerfil(`${PREFIJO_FOTO_PERFIL}mhb2k9x0-0123456789ab.webp`);
    expect(borrarPrivado).toHaveBeenCalledWith("perfiles/mhb2k9x0-0123456789ab.webp");
  });

  it("no deja pedir otras rutas", () => {
    expect(leerRutaFoto("../hardware/plano.pdf")).toBeNull();
    expect(leerRutaFoto("mensajes%2Fabc.webp")).toBeNull();
    expect(leerRutaFoto("abc")).toBeNull();
  });
});
