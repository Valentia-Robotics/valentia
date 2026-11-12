import { describe, expect, it } from "vitest";
import { formatoDeArchivo, modelosDeArchivos, textoMedida } from "./modelos3d";

describe("modelos 3D", () => {
  it("reconoce los formatos sin importar mayúsculas", () => {
    expect(formatoDeArchivo("servo.STL")).toBe("stl");
    expect(formatoDeArchivo("placa.glb")).toBe("glb");
    expect(formatoDeArchivo("leeme.txt")).toBeNull();
  });

  it("encuentra el modelo de cada slug y prefiere el .glb", () => {
    const m = modelosDeArchivos(["esp32-devkit.stl", "esp32-devkit.glb", "servo-mg996r.stl"], {});
    expect(m.get("esp32-devkit")?.formato).toBe("glb");
    expect(m.get("esp32-devkit")?.url).toBe("/modelos/componentes/esp32-devkit.glb");
    expect(m.get("servo-mg996r")?.formato).toBe("stl");
  });

  it("une el .obj con su .mtl y se salta nombres raros", () => {
    const m = modelosDeArchivos(
      ["motor.obj", "motor.mtl", "Mi Pieza.stl", ".oculto.stl", "LEEME.md"],
      {},
    );
    expect(m.get("motor")?.mtl).toBe("/modelos/componentes/motor.mtl");
    expect(m.size).toBe(1);
  });

  it("aplica los ajustes: unidad, color y giro en radianes", () => {
    const m = modelosDeArchivos(["chasis.stl"], {
      chasis: { unidad: "cm", color: "#ffffff", giro: [-90, 0, 0] },
    });
    const chasis = m.get("chasis")!;
    expect(chasis.escalaMm).toBe(10);
    expect(chasis.color).toBe("#ffffff");
    expect(chasis.giro[0]).toBeCloseTo(-Math.PI / 2);
  });

  it("escribe las medidas como se dicen", () => {
    expect(textoMedida(51.27)).toBe("51 mm");
    expect(textoMedida(0.84)).toBe("0,8 mm");
  });
});
