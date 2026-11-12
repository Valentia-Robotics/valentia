import { describe, expect, it } from "vitest";
import { AJUSTES_CALIDAD, NIVEL_INFERIOR, RITMO, crearVigilante, elegirCalidad } from "./calidad";

const ordenador = { ancho: 1440, tactil: false, memoria: 8, nucleos: 8 };

describe("elegirCalidad", () => {
  it("un ordenador con gráfica dedicada o Apple M va en alta", () => {
    expect(elegirCalidad({ ...ordenador, gpu: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)" })).toBe(
      "alta",
    );
    expect(elegirCalidad({ ...ordenador, gpu: "Apple M2" })).toBe("alta");
    expect(elegirCalidad({ ...ordenador })).toBe("alta");
  });

  it("un portátil con gráfica integrada normal va en media", () => {
    expect(
      elegirCalidad({ ...ordenador, gpu: "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)" }),
    ).toBe("media");
    expect(elegirCalidad({ ...ordenador, memoria: 4 })).toBe("media");
  });

  it("los móviles y tabletas, como mucho media", () => {
    expect(elegirCalidad({ ancho: 390, tactil: true, memoria: 8, gpu: "Apple GPU" })).toBe("media");
    expect(elegirCalidad({ ancho: 1024, tactil: true, gpu: "Adreno (TM) 740" })).toBe("media");
  });

  it("gráficas viejas, poca memoria o ahorro de datos: baja", () => {
    expect(elegirCalidad({ ...ordenador, gpu: "ANGLE (Intel, Intel(R) HD Graphics 4000)" })).toBe(
      "baja",
    );
    expect(elegirCalidad({ ancho: 390, tactil: true, gpu: "Mali-T720" })).toBe("baja");
    expect(elegirCalidad({ ancho: 390, tactil: true, gpu: "Adreno (TM) 506" })).toBe("baja");
    expect(elegirCalidad({ ancho: 390, tactil: true, memoria: 2 })).toBe("baja");
    expect(elegirCalidad({ ...ordenador, nucleos: 2 })).toBe("baja");
    expect(elegirCalidad({ ...ordenador, ahorroDatos: true })).toBe("baja");
  });

  it("sin tarjeta gráfica de verdad (dibujo por programa): foto fija", () => {
    expect(elegirCalidad({ ...ordenador, gpu: "Google SwiftShader" })).toBe("foto");
    expect(elegirCalidad({ ...ordenador, gpu: "llvmpipe (LLVM 15.0.7, 256 bits)" })).toBe("foto");
  });
});

describe("niveles", () => {
  it("cada nivel pide menos que el de arriba y baja acaba en la foto", () => {
    expect(AJUSTES_CALIDAD.alta.pixeles).toBeGreaterThan(AJUSTES_CALIDAD.media.pixeles);
    expect(AJUSTES_CALIDAD.media.pixeles).toBeGreaterThan(AJUSTES_CALIDAD.baja.pixeles);
    expect(AJUSTES_CALIDAD.baja.sombras).toBe(false);
    expect(NIVEL_INFERIOR.alta).toBe("media");
    expect(NIVEL_INFERIOR.baja).toBe("foto");
  });
});

describe("vigilante del ritmo", () => {
  const pasar = (v: ReturnType<typeof crearVigilante>, ms: number, veces: number) => {
    let bajar = false;
    for (let i = 0; i < veces; i++) bajar = v.apuntar(ms) || bajar;
    return bajar;
  };

  it("a 60 fotogramas por segundo no baja nunca", () => {
    expect(pasar(crearVigilante(), 16.7, 1000)).toBe(false);
  });

  it("a tirones baja, pero no durante el arranque", () => {
    const v = crearVigilante();
    expect(pasar(v, 50, RITMO.calentamiento)).toBe(false);
    expect(pasar(v, 50, RITMO.ventana)).toBe(true);
  });

  it("un salto suelto (pestaña escondida) no cuenta", () => {
    const v = crearVigilante();
    pasar(v, 16, RITMO.calentamiento);
    expect(v.apuntar(5000)).toBe(false);
    expect(pasar(v, 16, 300)).toBe(false);
  });

  it("varios saltos seguidos (aparato sin potencia, 1 fotograma por segundo) sí bajan", () => {
    const v = crearVigilante();
    expect(v.apuntar(900)).toBe(false);
    expect(v.apuntar(900)).toBe(false);
    expect(v.apuntar(900)).toBe(true);
  });

  it("tras bajar vuelve a esperar el calentamiento", () => {
    const v = crearVigilante();
    pasar(v, 50, RITMO.calentamiento + RITMO.ventana);
    expect(pasar(v, 50, RITMO.calentamiento)).toBe(false);
  });
});
