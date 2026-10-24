import { describe, expect, it } from "vitest";
import { datosKit, datosTienda, urlAbsoluta } from "./datosEstructurados";

const kit = {
  slug: "coche-seguidor",
  nombre: "Coche seguidor de líneas",
  eslogan: "Tu primer robot",
  descripcion: "",
  imagen: "/images/kits/coche.svg",
  precioCentimos: 4995,
};

describe("datos estructurados para Google", () => {
  it("convierte rutas propias en direcciones completas", () => {
    expect(urlAbsoluta("/kits/a")).toMatch(/^https?:\/\/[^/]+\/kits\/a$/);
    expect(urlAbsoluta("https://cdn.example.com/a.webp")).toBe("https://cdn.example.com/a.webp");
  });

  it("da el precio del kit en euros y su disponibilidad", () => {
    const abierta = datosKit(kit, true);
    expect(abierta.offers.price).toBe("49.95");
    expect(abierta.offers.priceCurrency).toBe("EUR");
    expect(abierta.offers.availability).toBe("https://schema.org/InStock");
    expect(abierta.description).toBe("Tu primer robot");
    expect(datosKit(kit, false).offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("presenta la tienda con su logo", () => {
    const [tienda, web] = datosTienda();
    expect(tienda["@type"]).toBe("Organization");
    expect(tienda.logo).toMatch(/icono-512\.png$/);
    expect(web["@type"]).toBe("WebSite");
  });
});
