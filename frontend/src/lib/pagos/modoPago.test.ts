import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { modoPago } = await import("./index");

/** Pone las variables de entorno de una prueba (se restauran al acabar) */
function entorno(variables: Record<string, string>) {
  for (const [clave, valor] of Object.entries(variables)) vi.stubEnv(clave, valor);
}

afterEach(() => vi.unstubAllEnvs());

describe("modoPago", () => {
  const prueba = {
    STRIPE_SECRET_KEY: "sk_test_x",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
  };
  const reales = {
    STRIPE_SECRET_KEY: "sk_live_x",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_x",
  };

  it("en la web publicada, con claves de prueba no se puede comprar", () => {
    entorno({ NODE_ENV: "production", ...prueba, STRIPE_PERMITIR_CLAVES_PRUEBA: "" });
    expect(modoPago()).toBe("desactivado");
  });

  it("con permiso expreso, las claves de prueba funcionan en la web publicada", () => {
    entorno({ NODE_ENV: "production", ...prueba, STRIPE_PERMITIR_CLAVES_PRUEBA: "si" });
    expect(modoPago()).toBe("stripe");
  });

  it("en desarrollo, las claves de prueba funcionan siempre", () => {
    entorno({ NODE_ENV: "development", ...prueba, STRIPE_PERMITIR_CLAVES_PRUEBA: "" });
    expect(modoPago()).toBe("stripe");
  });

  it("las claves reales necesitan su permiso", () => {
    entorno({ NODE_ENV: "production", ...reales, STRIPE_PERMITIR_CLAVES_REALES: "" });
    expect(() => modoPago()).toThrow();
    entorno({ STRIPE_PERMITIR_CLAVES_REALES: "si" });
    expect(modoPago()).toBe("stripe");
  });
});
