/** Pruebas de la validación del checkout (src/lib/validaciones/pedido.ts) */
import { describe, expect, it } from "vitest";
import {
  esquemaCarritoPedido,
  esquemaCheckout,
  formatearTelefono,
  normalizarTelefono,
} from "./pedido";

const datosBuenos = {
  nombre: "Ana García",
  email: "  Ana@Ejemplo.ES ",
  telefono: "612 345 678",
  direccion: "Calle Mayor 1, 2ºA",
  codigoPostal: "46001",
  ciudad: "Valencia",
  provincia: "Valencia",
};

describe("teléfono", () => {
  it.each(["612345678", "612 345 678", "+34 612 34 56 78", "0034612345678", "912-345-678"])(
    "acepta %s",
    (t) => {
      expect(normalizarTelefono(t)).toMatch(/^\+34[6789]\d{8}$/);
    },
  );

  it.each(["12345", "512345678", "61234567", "+44 7700 900123", "teléfono"])("rechaza %s", (t) => {
    expect(normalizarTelefono(t)).toBeNull();
  });

  it("se muestra en grupos de tres", () => {
    expect(formatearTelefono("+34612345678")).toBe("612 345 678");
  });
});

describe("datos de envío", () => {
  it("acepta datos correctos y normaliza email y teléfono", () => {
    const r = esquemaCheckout.safeParse(datosBuenos);
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("ana@ejemplo.es");
    expect(r.data?.telefono).toBe("+34612345678");
  });

  it("rechaza un código postal de fuera de la Comunidad Valenciana con un mensaje amable", () => {
    const r = esquemaCheckout.safeParse({
      ...datosBuenos,
      codigoPostal: "28001",
      provincia: "Valencia",
    });
    expect(r.success).toBe(false);
    const mensaje = r.error?.issues.find((i) => i.path[0] === "codigoPostal")?.message;
    expect(mensaje).toMatch(/solo enviamos a la Comunidad Valenciana/);
  });

  it("rechaza una provincia que no coincide con el código postal", () => {
    const r = esquemaCheckout.safeParse({ ...datosBuenos, codigoPostal: "03001" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["provincia"]);
  });

  it("rechaza provincias fuera de la zona", () => {
    expect(esquemaCheckout.safeParse({ ...datosBuenos, provincia: "Madrid" }).success).toBe(false);
  });
});

describe("carrito que llega del navegador", () => {
  it("no admite precios: solo qué y cuánto", () => {
    const r = esquemaCarritoPedido.safeParse([
      { tipo: "kit", slug: "brazo-robotico", cantidad: 1, precioCentimos: 1 },
    ]);
    expect(r.success).toBe(true);
    expect(r.data?.[0]).not.toHaveProperty("precioCentimos");
  });

  it("rechaza cantidades raras y carritos vacíos", () => {
    expect(esquemaCarritoPedido.safeParse([]).success).toBe(false);
    expect(esquemaCarritoPedido.safeParse([{ tipo: "kit", slug: "a", cantidad: 0 }]).success).toBe(
      false,
    );
    expect(
      esquemaCarritoPedido.safeParse([{ tipo: "kit", slug: "a", cantidad: 1.5 }]).success,
    ).toBe(false);
    expect(
      esquemaCarritoPedido.safeParse([{ tipo: "kit", slug: "../x", cantidad: 1 }]).success,
    ).toBe(false);
  });
});
