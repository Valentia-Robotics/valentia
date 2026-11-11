import { describe, expect, it } from "vitest";
import {
  direccionParaGuardar,
  esDireccionDeGiphy,
  esIdGif,
  leerListaGiphy,
  limpiarBusquedaGif,
} from "./gifs";

describe("GIFs del chat", () => {
  it("solo acepta ids de GIPHY normales", () => {
    expect(esIdGif("3o7TKSjRrfIPjeiVyM")).toBe(true);
    expect(esIdGif("../../etc")).toBe(false);
    expect(esIdGif("a b")).toBe(false);
    expect(esIdGif(12)).toBe(false);
  });

  it("solo descarga de GIPHY y por https", () => {
    expect(esDireccionDeGiphy("https://media2.giphy.com/media/x/giphy.gif")).toBe(true);
    expect(esDireccionDeGiphy("https://i.giphy.com/x.webp")).toBe(true);
    expect(esDireccionDeGiphy("http://media.giphy.com/x.gif")).toBe(false);
    expect(esDireccionDeGiphy("https://giphy.com.malo.es/x.gif")).toBe(false);
    expect(esDireccionDeGiphy("https://malo.es/?giphy.com")).toBe(false);
    expect(esDireccionDeGiphy("http://localhost:4100/x.gif", "http://localhost:4100/v1")).toBe(
      true,
    );
  });

  it("limpia la búsqueda", () => {
    expect(limpiarBusquedaGif("  hola   que tal ")).toBe("hola que tal");
    expect(limpiarBusquedaGif("a".repeat(80))).toHaveLength(50);
  });

  it("lee la lista de GIPHY y salta lo raro", () => {
    const lista = leerListaGiphy({
      data: [
        {
          id: "abc123",
          title: "Robot bailando",
          images: {
            fixed_width: {
              url: "https://media1.giphy.com/a/200w.gif",
              webp: "https://media1.giphy.com/a/200w.webp",
              width: "200",
              height: "150",
            },
          },
        },
        { id: "malo", images: { fixed_width: { url: "https://otro.com/a.gif" } } },
        { title: "sin id" },
      ],
    });
    expect(lista).toEqual([
      {
        id: "abc123",
        titulo: "Robot bailando",
        vistaPrevia: "https://media1.giphy.com/a/200w.webp",
        ancho: 200,
        alto: 150,
      },
    ]);
    expect(leerListaGiphy(null)).toEqual([]);
  });

  it("elige la versión que cabe para guardar", () => {
    const cuerpo = {
      data: {
        images: {
          downsized_medium: { url: "https://media.giphy.com/m.gif", size: "9000000" },
          downsized: { url: "https://media.giphy.com/d.gif", size: "1500000" },
        },
      },
    };
    expect(direccionParaGuardar(cuerpo, 5_000_000)).toBe("https://media.giphy.com/d.gif");
    expect(direccionParaGuardar(cuerpo, 10_000_000)).toBe("https://media.giphy.com/m.gif");
    expect(direccionParaGuardar({ data: {} }, 10)).toBeNull();
  });
});
