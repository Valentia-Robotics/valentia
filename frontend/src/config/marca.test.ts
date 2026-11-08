/** Pruebas de la sección activa de la navegación (enSeccion) */
import { describe, expect, it } from "vitest";
import { enSeccion } from "./marca";

describe("sección activa del menú", () => {
  it("Inicio solo se marca en la portada", () => {
    expect(enSeccion("/", { href: "/" })).toBe(true);
    expect(enSeccion("/kits", { href: "/" })).toBe(false);
  });

  it("incluye las subpáginas", () => {
    expect(enSeccion("/kits/vr1-starter-kit", { href: "/kits" })).toBe(true);
    expect(enSeccion("/cursos/curso/leccion/test", { href: "/cursos" })).toBe(true);
  });

  it("no confunde direcciones que empiezan igual", () => {
    expect(enSeccion("/kitsune", { href: "/kits" })).toBe(false);
  });

  it("cuenta las direcciones extra", () => {
    expect(enSeccion("/activar", { href: "/cursos", tambien: ["/activar"] })).toBe(true);
  });
});
