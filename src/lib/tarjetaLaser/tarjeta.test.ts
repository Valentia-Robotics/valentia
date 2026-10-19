import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { tarjetaLaserSvg } from "./tarjeta";
import { crearZip } from "./zip";

const datos = (codigo: string, nombreKit = "Coche seguidor de líneas") => ({
  codigo,
  nombreKit,
  url: `https://valentia.test/activar?codigo=${codigo}`,
  dominio: "valentia.test",
});

describe("tarjeta para láser", () => {
  it("dibuja las dos caras en mm reales, solo con formas (sin texto ni imágenes)", () => {
    const svg = tarjetaLaserSvg(datos("VAL-AAAA-BBBB"));
    expect(svg).toContain('width="183.2mm"');
    expect(svg).toContain('id="delantera-grabar"');
    expect(svg).toContain('id="trasera-cortar"');
    expect(svg).not.toMatch(/<text|<image|NaN|undefined/);
  });

  it("cada código tiene su propio QR", () => {
    const a = tarjetaLaserSvg(datos("VAL-AAAA-BBBB"));
    const b = tarjetaLaserSvg(datos("VAL-CCCC-DDDD"));
    const qr = (svg: string) => svg.split('id="delantera-grabar"')[1].split("<path")[1];
    expect(qr(a)).not.toBe(qr(b));
  });

  it("los nombres de kit largos no rompen la tarjeta", () => {
    const svg = tarjetaLaserSvg(
      datos("VAL-AAAA-BBBB", "Estación meteorológica con pantalla y sensores"),
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
