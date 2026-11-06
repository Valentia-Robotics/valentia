import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { urlActivacion } = await import("./qr");

describe("urlActivacion", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("nunca pone una dirección local en las tarjetas", () => {
    for (const local of ["http://localhost:3000", "http://127.0.0.1:3000/", ""]) {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", local);
      expect(urlActivacion("VAL-AAAA-BBBB")).toBe(
        "https://valentiarobotics.com/activar?codigo=VAL-AAAA-BBBB",
      );
    }
  });

  it("usa la web configurada si es pública", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://valentia.test/");
    expect(urlActivacion("VAL-AAAA-BBBB")).toBe(
      "https://valentia.test/activar?codigo=VAL-AAAA-BBBB",
    );
  });
});
