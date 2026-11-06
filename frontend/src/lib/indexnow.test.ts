import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLAVE_INDEXNOW, direccionesDelSitemap } from "./indexnow";

describe("indexnow", () => {
  it("el archivo de la clave existe y contiene la clave", () => {
    const archivo = path.join(process.cwd(), "public", `${CLAVE_INDEXNOW}.txt`);
    expect(readFileSync(archivo, "utf8").trim()).toBe(CLAVE_INDEXNOW);
  });

  it("saca las direcciones del sitemap", () => {
    const xml = `<urlset><url><loc>https://a.es/</loc></url><url><loc> https://a.es/kits </loc></url></urlset>`;
    expect(direccionesDelSitemap(xml)).toEqual(["https://a.es/", "https://a.es/kits"]);
  });
});
