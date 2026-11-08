import { describe, expect, it } from "vitest";
import { renombrarKits } from "./renombrarKits";
import { redireccionesKitsRenombrados, slugKitActual } from "@/config/kitsRenombrados";

type Fila = Record<string, unknown>;

/** Base de datos de mentira con lo justo (findOne, updateOne, updateMany con igualdades) */
function bdFalsa(datos: Record<string, Fila[]>) {
  const coincide = (f: Fila, filtro: Fila) => Object.entries(filtro).every(([k, v]) => f[k] === v);
  return {
    datos,
    collection: (nombre: string) => {
      const filas = (datos[nombre] ??= []);
      const cambiar = (filtro: Fila, cambio: { $set: Fila }, todas: boolean) => {
        let n = 0;
        for (const f of filas)
          if (coincide(f, filtro) && (todas || n === 0)) {
            Object.assign(f, cambio.$set);
            n++;
          }
        return { modifiedCount: n };
      };
      return {
        findOne: async (filtro: Fila) => filas.find((f) => coincide(f, filtro)) ?? null,
        updateOne: async (filtro: Fila, cambio: { $set: Fila }) => cambiar(filtro, cambio, false),
        updateMany: async (filtro: Fila, cambio: { $set: Fila }) => cambiar(filtro, cambio, true),
      };
    },
  };
}

const RENOMBRES = { "coche-viejo": "coche-nuevo" };

describe("kits renombrados", () => {
  it("slugKitActual cambia solo los slugs viejos", () => {
    expect(slugKitActual("coche-seguidor-de-lineas")).toBe("vr1-starter-kit");
    expect(slugKitActual("brazo-robotico")).toBe("brazo-robotico");
    expect(slugKitActual("toString")).toBe("toString");
  });

  it("la ficha y las fotos viejas llevan a las nuevas", () => {
    const r = redireccionesKitsRenombrados();
    expect(r).toContainEqual({
      source: "/kits/coche-seguidor-de-lineas",
      destination: "/kits/vr1-starter-kit",
      permanent: true,
    });
    expect(r.map((x) => x.source)).toContain("/images/redes/kits/coche-seguidor-de-lineas.png");
  });

  it("cambia el kit, su foto de siempre, los pedidos y la lista de espera; repetir no hace nada", async () => {
    const bd = bdFalsa({
      Kit: [{ slug: "coche-viejo", imagen: "/images/kits/coche-viejo.svg" }, { slug: "brazo" }],
      LineaPedido: [
        { tipo: "KIT", slug: "coche-viejo" },
        { tipo: "COMPONENTE", slug: "coche-viejo" },
      ],
      ListaEspera: [{ kitSlug: "coche-viejo" }, { kitSlug: null }],
    });
    const [r] = await renombrarKits(bd as never, RENOMBRES);
    expect(r).toMatchObject({ kit: "renombrado", lineasPedido: 1, listaEspera: 1 });
    expect(bd.datos.Kit[0]).toEqual({
      slug: "coche-nuevo",
      imagen: "/images/kits/coche-nuevo.svg",
    });
    expect(bd.datos.LineaPedido[1].slug).toBe("coche-viejo");

    const [otra] = await renombrarKits(bd as never, RENOMBRES);
    expect(otra).toMatchObject({ kit: "ya-estaba", lineasPedido: 0, listaEspera: 0 });
  });

  it("no toca una foto subida desde el panel", async () => {
    const bd = bdFalsa({ Kit: [{ slug: "coche-viejo", imagen: "/subidas/kits/foto.webp" }] });
    await renombrarKits(bd as never, RENOMBRES);
    expect(bd.datos.Kit[0]).toEqual({ slug: "coche-nuevo", imagen: "/subidas/kits/foto.webp" });
  });
});
