import { describe, expect, it } from "vitest";
import { esquemaEnlaceVideo, esquemaGuion } from "./guion";

const guion = {
  titulo: "Cómo sigue la línea un robot",
  categoriaId: "6ad5f9ba06cf870884abee1c",
  plataforma: "VIDEO_CORTO",
  plataformaOtra: "",
  duracionObjetivo: "45 segundos",
  gancho: "¿Sabías que…?",
  desarrollo: "Texto",
  llamadaAccion: "Sigue a Valentia",
  notasVisuales: "Primer plano",
  kitId: "",
  fechaLimite: "2026-11-30",
};

describe("guiones", () => {
  it("acepta un guion completo y sin kit", () => {
    const datos = esquemaGuion.parse(guion);
    expect(datos.kitId).toBeNull();
    expect(datos.fechaLimite.toISOString()).toBe("2026-11-30T12:00:00.000Z");
  });

  it("la categoría y la fecha límite son obligatorias", () => {
    expect(esquemaGuion.safeParse({ ...guion, categoriaId: "" }).success).toBe(false);
    expect(esquemaGuion.safeParse({ ...guion, fechaLimite: "" }).success).toBe(false);
  });

  it("con plataforma «otra» hay que decir cuál", () => {
    expect(esquemaGuion.safeParse({ ...guion, plataforma: "OTRA" }).success).toBe(false);
    const datos = esquemaGuion.parse({ ...guion, plataforma: "OTRA", plataformaOtra: "Twitch" });
    expect(datos.plataformaOtra).toBe("Twitch");
  });

  it("el enlace del vídeo tiene que ser una dirección web", () => {
    expect(esquemaEnlaceVideo.safeParse("https://youtu.be/abc").success).toBe(true);
    expect(esquemaEnlaceVideo.safeParse("javascript:alert(1)").success).toBe(false);
    expect(esquemaEnlaceVideo.safeParse("mi vídeo").success).toBe(false);
  });
});
