import { describe, expect, it } from "vitest";
import { ORIGEN_DIRECTO, ORIGEN_QR, origenDeLlegada, vieneDeQr } from "./llegada";

const dominio = "valentiarobotics.com";
const llegada = (datos: object) =>
  JSON.stringify({ referente: "", utm: "", entrada: "/", ...datos });

describe("cómo llegó cada cliente", () => {
  it("el QR de una tarjeta lleva a /activar con código", () => {
    expect(vieneDeQr("/activar?codigo=VAL-ABCD-EFGH")).toBe(true);
    expect(vieneDeQr("/registro?callbackUrl=%2Factivar%3Fcodigo%3DVAL-ABCD-EFGH")).toBe(true);
    expect(vieneDeQr("/activar")).toBe(false);
    expect(vieneDeQr("/kits")).toBe(false);
    expect(origenDeLlegada(llegada({ entrada: "/activar?codigo=VAL-ABCD-EFGH" }), dominio)).toBe(
      ORIGEN_QR,
    );
  });

  it("buscadores, redes y enlaces con utm_source", () => {
    expect(origenDeLlegada(llegada({ referente: "https://www.google.es/" }), dominio)).toBe(
      "Google",
    );
    expect(origenDeLlegada(llegada({ utm: "instagram" }), dominio)).toBe("Instagram");
    expect(origenDeLlegada(llegada({ referente: "https://blog.ejemplo.com/a" }), dominio)).toBe(
      "blog.ejemplo.com",
    );
  });

  it("sin web anterior es directo; datos raros no se guardan", () => {
    expect(origenDeLlegada(llegada({}), dominio)).toBe(ORIGEN_DIRECTO);
    expect(
      origenDeLlegada(llegada({ referente: "https://valentiarobotics.com/kits" }), dominio),
    ).toBe(ORIGEN_DIRECTO);
    expect(origenDeLlegada("no es json", dominio)).toBeNull();
    expect(origenDeLlegada(null, dominio)).toBeNull();
    expect(origenDeLlegada("x".repeat(3000), dominio)).toBeNull();
  });
});
