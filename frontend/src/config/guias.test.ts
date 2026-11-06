import { describe, expect, it } from "vitest";
import componentes from "../../data/componentes.json";
import kits from "../../data/kits.json";
import { guias } from "./guias";

const slugsKits = new Set(kits.map((k) => k.slug));
const slugsComponentes = new Set(componentes.map((c) => c.slug));
const slugsGuias = new Set(guias.map((g) => g.slug));

describe("guías", () => {
  it("no repiten dirección", () => {
    expect(slugsGuias.size).toBe(guias.length);
  });

  it("solo nombran kits y componentes que existen", () => {
    for (const g of guias) {
      for (const k of g.kits) expect(slugsKits, `${g.slug} → ${k}`).toContain(k);
      for (const c of g.componentes) expect(slugsComponentes, `${g.slug} → ${c}`).toContain(c);
    }
  });

  it("los enlaces del texto llevan a páginas que existen", () => {
    const fijas = new Set(["/configurador", "/componentes", "/kits", "/guias"]);
    for (const g of guias) {
      const textos = g.secciones.flatMap((s) => [...s.parrafos, ...(s.lista ?? [])]);
      for (const [, ruta] of textos.join(" ").matchAll(/\]\(([^)]+)\)/g)) {
        const [, seccion, slug] = ruta.split("/");
        const valida =
          fijas.has(ruta) ||
          (seccion === "guias" && slugsGuias.has(slug)) ||
          (seccion === "kits" && slugsKits.has(slug)) ||
          (seccion === "componentes" && slugsComponentes.has(slug));
        expect(valida, `${g.slug} → ${ruta}`).toBe(true);
      }
    }
  });
});
