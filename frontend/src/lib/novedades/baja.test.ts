import { describe, expect, it } from "vitest";
import { plantillaNovedades } from "@/lib/correo/plantillas";
import { firmaBaja, firmaBajaValida, urlBaja } from "./baja";

const CLAVE = "clave-de-prueba";
const ID = "65a1b2c3d4e5f60718293a4b";

describe("enlace de baja", () => {
  it("la firma vale solo para su cuenta y su clave", () => {
    const firma = firmaBaja(ID, CLAVE);
    expect(firmaBajaValida(ID, firma, CLAVE)).toBe(true);
    expect(firmaBajaValida("65a1b2c3d4e5f60718293a4c", firma, CLAVE)).toBe(false);
    expect(firmaBajaValida(ID, firma, "otra-clave")).toBe(false);
    expect(firmaBajaValida(ID, "corta", CLAVE)).toBe(false);
  });

  it("la dirección lleva la cuenta y la firma", () => {
    expect(urlBaja(ID, CLAVE)).toContain(`/novedades/baja?u=${ID}&t=${firmaBaja(ID, CLAVE)}`);
  });
});

describe("plantilla de novedades", () => {
  it("lleva «Publicidad», el enlace de baja y escapa lo que escribe el admin", () => {
    const correo = plantillaNovedades({
      para: "ana@ejemplo.com",
      nombre: "Ana García",
      asunto: "Kit nuevo",
      titulo: "Ya está <aquí>",
      parrafos: [["Uno <b>", "dos"], ["tres"]],
      boton: { texto: "Ver el kit", url: "/kits/vr1-starter-kit" },
      urlBaja: "https://valentiarobotics.com/novedades/baja?u=1&t=2",
    });
    expect(correo.html).toContain("Publicidad");
    expect(correo.html).toContain("Hola, Ana:");
    expect(correo.html).toContain("Uno &lt;b&gt;<br>dos");
    expect(correo.html).not.toContain("<b>");
    expect(correo.html).toContain("/kits/vr1-starter-kit");
    expect(correo.html).toContain("novedades/baja?u=1&amp;t=2");
    expect(correo.texto).toContain("https://valentiarobotics.com/novedades/baja?u=1&t=2");
  });

  it("cambia [nombre] por el nombre de cada cliente, en el saludo, el asunto, el título y el texto", () => {
    const hacer = (nombre: string) =>
      plantillaNovedades({
        para: "x@ejemplo.com",
        nombre,
        asunto: "[nombre], ya está aquí",
        titulo: "Para ti, [Nombre]",
        parrafos: [["Hemos pensado en ti, [NOMBRE]."]],
        urlBaja: "https://valentiarobotics.com/novedades/baja?u=1&t=2",
      });
    const ana = hacer("Ana García");
    expect(ana.asunto).toBe("Ana, ya está aquí");
    expect(ana.html).toContain("Hola, Ana:");
    expect(ana.html).toContain("Para ti, Ana");
    expect(ana.html).toContain("Hemos pensado en ti, Ana.");
    expect(ana.texto).toContain("Hemos pensado en ti, Ana.");
    expect(ana.html).not.toContain("Jesse");
    const luis = hacer("Luis");
    expect(luis.html).toContain("Hola, Luis:");
    expect(hacer("<b>X</b>").html).not.toContain("<b>X");
  });
});
