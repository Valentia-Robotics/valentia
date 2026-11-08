import { describe, expect, it } from "vitest";
import { datosKit, datosTienda, urlAbsoluta } from "./datosEstructurados";

const kit = {
  slug: "coche-seguidor",
  nombre: "Kit de coche robótico multifunción VR1 - Starter Kit",
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
    expect(tienda["@type"]).toBe("OnlineStore");
    expect(tienda.logo).toMatch(/icono-512\.png$/);
    expect(web["@type"]).toBe("WebSite");
  });
});

describe("estrellas de las opiniones en Google", () => {
  it("solo añade la nota si hay opiniones publicadas", () => {
    expect(datosKit(kit, true, { media: 0, total: 0, resenas: [] })).not.toHaveProperty(
      "aggregateRating",
    );
    const conOpiniones = datosKit(kit, true, {
      media: 4.5,
      total: 2,
      resenas: [{ autor: "Ana G.", estrellas: 5, texto: "Genial", fecha: new Date("2026-10-24") }],
    });
    expect(conOpiniones).toMatchObject({
      aggregateRating: { ratingValue: 4.5, reviewCount: 2 },
      review: [{ author: { name: "Ana G." }, datePublished: "2026-10-24" }],
    });
  });
});
