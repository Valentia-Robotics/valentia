import { describe, expect, it } from "vitest";
import kits from "../../../data/kits.json";
import { precioDeKit } from "../utils";
import { esquemaKitAdmin } from "./admin";
import { esquemaKit } from "./catalogo";

const pieza = { id: "6ad5f9ba06cf870884abee1c", cantidad: "1" };
const kitAdmin = {
  nombre: "Kit",
  eslogan: "Eslogan",
  descripcion: "Descripción",
  nivel: "Principiante",
  edadMinima: "6",
  tiempoMontaje: "Sin montaje",
  orden: "4",
  destacado: false,
  visible: true,
  puntosFuertes: ["Punto"],
  cursoId: "6ad5f9b506cf870884abedf9",
};

describe("kits gratis", () => {
  it("un precio de 0 se anuncia como «Gratis»", () => {
    expect(precioDeKit(0)).toBe("Gratis");
    expect(precioDeKit(6990)).toContain("69,90");
  });

  it("todos los kits de data/kits.json son válidos", () => {
    for (const kit of kits) expect(esquemaKit.safeParse(kit).success).toBe(true);
  });

  it("catálogo: de pago con piezas, gratis sin piezas", () => {
    const [dePago] = kits;
    expect(esquemaKit.safeParse({ ...dePago, componentes: [] }).success).toBe(false);
    expect(esquemaKit.safeParse({ ...dePago, precio: 0 }).success).toBe(false);
    expect(esquemaKit.safeParse({ ...dePago, precio: -1 }).success).toBe(false);
  });

  it("panel: admite un kit gratis sin piezas", () => {
    const gratis = esquemaKitAdmin.safeParse({ ...kitAdmin, precio: "0", componentes: [] });
    expect(gratis.success).toBe(true);
  });

  it("panel: rechaza mezclar precio y piezas al revés", () => {
    const sinPiezas = esquemaKitAdmin.safeParse({ ...kitAdmin, precio: "10", componentes: [] });
    const conPiezas = esquemaKitAdmin.safeParse({ ...kitAdmin, precio: "0", componentes: [pieza] });
    expect(sinPiezas.success).toBe(false);
    expect(conPiezas.success).toBe(false);
  });
});
