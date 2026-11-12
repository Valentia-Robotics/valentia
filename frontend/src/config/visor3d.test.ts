import { describe, expect, it } from "vitest";
import { ORIGEN_VISOR_3D_POR_DEFECTO, origenVisor3d, tiene3d, urlVisor3d } from "./visor3d";

describe("visor 3D de las piezas", () => {
  it("una pieza con modelo abre su demo vr-<slug> en modo ficha", () => {
    expect(urlVisor3d("arduino-uno-r3", "https://visor.ejemplo")).toBe(
      "https://visor.ejemplo/demo/vr-arduino-uno-r3?ficha=1",
    );
  });

  it("una pieza sin modelo no tiene botón", () => {
    expect(tiene3d("pieza-nueva-sin-modelo")).toBe(false);
    expect(urlVisor3d("pieza-nueva-sin-modelo", "https://visor.ejemplo")).toBeNull();
  });

  it("el origen sale de la variable solo si es una dirección http(s)", () => {
    expect(origenVisor3d("http://localhost:4300/")).toBe("http://localhost:4300");
    expect(origenVisor3d("https://www.visualizalo.es/demo/x")).toBe("https://www.visualizalo.es");
    expect(origenVisor3d("javascript:alert(1)")).toBe(ORIGEN_VISOR_3D_POR_DEFECTO);
    expect(origenVisor3d("")).toBe(ORIGEN_VISOR_3D_POR_DEFECTO);
    expect(origenVisor3d(undefined)).toBe(ORIGEN_VISOR_3D_POR_DEFECTO);
  });
});
