import { describe, expect, it } from "vitest";
import { esquemaResena, formatearMedia, mediaEstrellas, nombrePublico } from "./formato";

describe("reseñas", () => {
  it("publica solo el nombre y la inicial del apellido", () => {
    expect(nombrePublico("Ana García López")).toBe("Ana G.");
    expect(nombrePublico("  jesse  ")).toBe("jesse");
    expect(nombrePublico("")).toBe("Cliente");
  });

  it("calcula la media con un decimal", () => {
    expect(mediaEstrellas([])).toBe(0);
    expect(mediaEstrellas([5, 4, 4])).toBe(4.3);
    expect(formatearMedia(4.3)).toBe("4,3");
  });

  it("pide de 1 a 5 estrellas y un comentario con sentido", () => {
    expect(esquemaResena.safeParse({ estrellas: "5", texto: "Me ha encantado" }).success).toBe(
      true,
    );
    expect(esquemaResena.safeParse({ estrellas: "0", texto: "Me ha encantado" }).success).toBe(
      false,
    );
    expect(esquemaResena.safeParse({ estrellas: "6", texto: "Me ha encantado" }).success).toBe(
      false,
    );
    expect(esquemaResena.safeParse({ estrellas: "", texto: "Me ha encantado" }).success).toBe(
      false,
    );
    expect(esquemaResena.safeParse({ estrellas: "4", texto: "  corto " }).success).toBe(false);
  });
});
