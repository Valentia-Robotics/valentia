import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import ClipperLib from "clipper-lib";
import { poligonosDe } from "./fusion";
import { tarjetaLaserSvg } from "./tarjeta";
import { crearZip } from "./zip";

const datos = (
  codigo: string,
  nombreKit = "Kit de coche robótico multifunción VR1 - Starter Kit",
) => ({
  codigo,
  nombreKit,
  url: `https://valentia.test/activar?codigo=${codigo}`,
  dominio: "valentia.test",
});

const KITS = [
  "vr1-starter-kit",
  "brazo-robotico",
  "estacion-meteorologica",
  "bienvenida-valentia",
  "otro",
];
const W = 85.6;
const H = 54;

/** Área que se grabaría con una regla de relleno dada (en mm²) */
function area(d: string, regla: ClipperLib.PolyFillType) {
  const caminos = poligonosDe(d).map((p) => p.map(([X, Y]) => ({ X: X * 1000, Y: Y * 1000 })));
  const c = new ClipperLib.Clipper();
  c.AddPaths(caminos, ClipperLib.PolyType.ptSubject, true);
  const salida: ClipperLib.IntPoint[][] = [];
  c.Execute(ClipperLib.ClipType.ctUnion, salida, regla, regla);
  return salida.reduce((s, p) => s + ClipperLib.Clipper.Area(p), 0) / 1e6;
}

describe("tarjeta para láser", () => {
  for (const slugKit of KITS)
    for (const cara of ["delantera", "trasera"] as const)
      it(`${slugKit} · ${cara}: solo grabado, tamaño de la tarjeta, centrado y sin solapes`, () => {
        const svg = tarjetaLaserSvg({ ...datos("VAL-AAAA-BBBB"), slugKit }, cara);
        expect(svg).toContain(`width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"`);
        expect(svg).not.toMatch(/<text|<image|NaN|undefined|stroke="#|FF0000/);
        expect(svg.match(/<path/g)).toHaveLength(1);
        const d = svg.match(/ d="([^"]*)"/)![1];
        // Todo dentro de la tarjeta y con el mismo margen en los cuatro lados (escuadras a 2 mm)
        const pts = poligonosDe(d).flat();
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        expect(Math.min(...xs)).toBeCloseTo(1.85, 2);
        expect(Math.max(...xs)).toBeCloseTo(W - 1.85, 2);
        expect(Math.min(...ys)).toBeCloseTo(1.85, 2);
        expect(Math.max(...ys)).toBeCloseTo(H - 1.85, 2);
        // Sin solapes: da igual que el láser use "nonzero" o "evenodd"
        const nz = area(d, ClipperLib.PolyFillType.pftNonZero);
        const eo = area(d, ClipperLib.PolyFillType.pftEvenOdd);
        expect(Math.abs(nz - eo)).toBeLessThan(0.01);
      });

  it("cada código tiene su propio QR", () => {
    const a = tarjetaLaserSvg(datos("VAL-AAAA-BBBB"), "delantera");
    const b = tarjetaLaserSvg(datos("VAL-CCCC-DDDD"), "delantera");
    expect(a).not.toBe(b);
  });

  it("tarjeta de bienvenida: cada código tiene su QR delante y su código detrás", () => {
    const tarjeta = (codigo: string, cara: "delantera" | "trasera") =>
      tarjetaLaserSvg({ ...datos(codigo), slugKit: "bienvenida-valentia" }, cara);
    expect(tarjeta("VAL-AAAA-BBBB", "delantera")).not.toBe(tarjeta("VAL-CCCC-DDDD", "delantera"));
    expect(tarjeta("VAL-AAAA-BBBB", "trasera")).not.toBe(tarjeta("VAL-CCCC-DDDD", "trasera"));
    // Y no se parece a la de un kit
    expect(tarjeta("VAL-AAAA-BBBB", "trasera")).not.toBe(
      tarjetaLaserSvg({ ...datos("VAL-AAAA-BBBB"), slugKit: "otro" }, "trasera"),
    );
  });

  it("los nombres de kit largos no rompen la tarjeta", () => {
    const svg = tarjetaLaserSvg(
      datos("VAL-AAAA-BBBB", "Estación meteorológica con pantalla y sensores"),
      "delantera",
    );
    expect(svg).not.toMatch(/NaN|undefined/);
  });
});

describe("zip", () => {
  it("guarda los archivos y se pueden recuperar", () => {
    const archivos = [
      { nombre: "LEEME.txt", contenido: "Hola, cañón" },
      { nombre: "VAL-AAAA-BBBB.svg", contenido: "<svg/>".repeat(100) },
    ];
    const zip = Buffer.from(crearZip(archivos));
    // Índice final: número de archivos
    const fin = zip.length - 22;
    expect(zip.readUInt32LE(fin)).toBe(0x06054b50);
    expect(zip.readUInt16LE(fin + 10)).toBe(2);
    // Primer archivo: nombre y contenido descomprimido
    const largoNombre = zip.readUInt16LE(26);
    const comprimido = zip.readUInt32LE(18);
    expect(zip.subarray(30, 30 + largoNombre).toString()).toBe("LEEME.txt");
    const datos = inflateRawSync(zip.subarray(30 + largoNombre, 30 + largoNombre + comprimido));
    expect(datos.toString()).toBe("Hola, cañón");
  });
});
