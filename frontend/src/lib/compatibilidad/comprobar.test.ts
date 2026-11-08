/**
 * Pruebas de las reglas de compatibilidad del configurador (reglas.ts + comprobar.ts),
 * con los componentes reales de data/componentes.json.
 */
import { describe, expect, it } from "vitest";
import datos from "../../../data/componentes.json";
import type { ComponenteCatalogo } from "@/types/catalogo";
import { comprobarRobot } from "./comprobar";
import type { PiezaConDatos } from "./tipos";

type Fila = (typeof datos)[number];

const catalogo = new Map<string, ComponenteCatalogo>(
  datos.map((c: Fila) => [
    c.slug,
    {
      ...c,
      precioCentimos: Math.round(c.precio * 100),
      voltajeLogico: c.voltajeLogico ?? null,
      voltajeLogicoMin: ("voltajeLogicoMin" in c ? c.voltajeLogicoMin : null) ?? null,
    } as unknown as ComponenteCatalogo,
  ]),
);

/** robot({ "arduino-uno-r3": 1, "servo-sg90": 2 }) */
function robot(piezas: Record<string, number>): PiezaConDatos[] {
  return Object.entries(piezas).map(([slug, cantidad]) => {
    const componente = catalogo.get(slug);
    if (!componente) throw new Error(`No existe el componente ${slug}`);
    return { componente, cantidad };
  });
}

const ids = (piezas: Record<string, number>) =>
  comprobarRobot(robot(piezas)).avisos.map((a) => a.id);

describe("motor de compatibilidad", () => {
  it("un robot vacío no tiene avisos", () => {
    const d = comprobarRobot([]);
    expect(d.avisos).toEqual([]);
    expect(d.errores).toBe(0);
    expect(d.avisos.map((a) => a.id)).not.toContain("logica-5v-en-placa-3v3");
  });

  it("una pieza que solo va a 5 V sí avisa con la ESP32", () => {
    expect(ids({ "esp32-devkit": 1, "zumbador-activo": 1 })).toContain("logica-5v-en-placa-3v3");
  });

  it("las piezas de 3,3 a 5 V tampoco avisan con Arduino", () => {
    expect(ids({ "arduino-uno-r3": 1, "sensor-ultrasonidos-hc-sr04": 1 })).not.toContain(
      "logica-3v3-en-placa-5v",
    );
  });

  it("el kit del coche seguidor de líneas (con ESP32) no tiene errores ni avisos de voltios", () => {
    const d = comprobarRobot(
      robot({
        "esp32-devkit": 1,
        "driver-motores-l298n": 1,
        "motor-dc-reductora": 2,
        "sensor-linea-tcrt5000": 2,
        "sensor-ultrasonidos-hc-sr04": 1,
        "portapilas-4xaa": 1,
        "chasis-coche-2wd": 1,
      }),
    );
    expect(d.errores).toBe(0);
  });

  it("un sensor sin placa avisa de que falta la placa", () => {
    expect(ids({ "sensor-luz-ldr": 1 })).toContain("necesita-placa");
  });

  it("un motor sin driver avisa (y sugiere el driver)", () => {
    const d = comprobarRobot(robot({ "arduino-uno-r3": 1, "motor-dc-reductora": 2 }));
    const aviso = d.avisos.find((a) => a.id === "motor-necesita-driver");
    expect(aviso).toBeDefined();
    expect(aviso?.sugerencia).toBe("driver-motores-l298n");
  });

  it("un driver mueve 2 motores: con 4 motores hacen falta 2 drivers", () => {
    const base = { "arduino-uno-r3": 1, "portapilas-4xaa": 1, "chasis-coche-2wd": 1 };
    expect(ids({ ...base, "motor-dc-reductora": 2, "driver-motores-l298n": 1 })).not.toContain(
      "motor-necesita-driver",
    );
    expect(ids({ ...base, "motor-dc-reductora": 4, "driver-motores-l298n": 1 })).toContain(
      "motor-necesita-driver",
    );
  });

  it("no se pueden poner dos placas", () => {
    expect(ids({ "arduino-uno-r3": 1, "esp32-devkit": 1 })).toContain("una-sola-placa");
  });

  it("los avisos van ordenados de más grave a menos grave", () => {
    const orden = { error: 0, aviso: 1, info: 2 } as const;
    const d = comprobarRobot(robot({ "motor-dc-reductora": 3, "servo-mg996r": 2 }));
    const niveles = d.avisos.map((a) => orden[a.nivel]);
    expect(niveles).toEqual([...niveles].sort((a, b) => a - b));
    expect(d.errores).toBe(d.avisos.filter((a) => a.nivel === "error").length);
  });

  it("los mensajes no dejan huecos {sin rellenar}", () => {
    const d = comprobarRobot(
      robot({ "esp32-devkit": 1, "arduino-uno-r3": 1, "motor-dc-reductora": 6, "servo-mg996r": 4 }),
    );
    for (const aviso of d.avisos) expect(aviso.mensaje).not.toMatch(/\{\w+\}/);
  });

  it("mide los pines usados frente a los que ofrece la placa", () => {
    const d = comprobarRobot(robot({ "arduino-uno-r3": 1, "servo-sg90": 2 }));
    expect(d.medidores.length).toBeGreaterThan(0);
  });
});
