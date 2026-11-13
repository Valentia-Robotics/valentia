import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { firmarJwt } from "@/lib/mensajes/jwtVideo";
import {
  SEGUNDOS_PRESENTE,
  conPresente,
  datosJwtJaas,
  debeSonar,
  direccionSala,
  esNombreSala,
  llamadaActiva,
  nombreSala,
  presentesActivos,
  servicioVideo,
  sinPresente,
  textoPresentes,
} from "./llamadas";
import { avisoDeLlamada } from "./push";

const AHORA = new Date("2026-11-13T10:00:00Z");
const hace = (segundos: number) => new Date(AHORA.getTime() - segundos * 1000);
const JESSE = "a".repeat(24);
const DANI = "b".repeat(24);

const llamada = (datos: Partial<Parameters<typeof llamadaActiva>[0]> = {}) => ({
  iniciadaPorId: JESSE,
  empezadaEn: hace(600),
  terminadaEn: null,
  presentes: [{ usuarioId: JESSE, nombre: "Jesse", vistoEn: hace(10) }],
  ...datos,
});

describe("quién sigue en la llamada", () => {
  it("cuenta solo a los que han mandado un latido hace poco", () => {
    const presentes = [
      { usuarioId: JESSE, nombre: "Jesse", vistoEn: hace(10) },
      { usuarioId: DANI, nombre: "Dani", vistoEn: hace(SEGUNDOS_PRESENTE + 1) },
    ];
    expect(presentesActivos(presentes, AHORA).map((p) => p.nombre)).toEqual(["Jesse"]);
  });

  it("apuntar a alguien no lo repite y quitarlo lo saca", () => {
    const una = conPresente([], { usuarioId: DANI, nombre: "Dani" }, hace(20));
    const dos = conPresente(una, { usuarioId: DANI, nombre: "Dani" }, AHORA);
    expect(dos).toHaveLength(1);
    expect(dos[0].vistoEn).toEqual(AHORA);
    expect(sinPresente(dos, DANI, AHORA)).toEqual([]);
  });
});

describe("¿sigue la llamada?", () => {
  it("con alguien dentro, sí; sin nadie, no; terminada, no", () => {
    expect(llamadaActiva(llamada(), AHORA)).toBe(true);
    expect(llamadaActiva(llamada({ presentes: [] }), AHORA)).toBe(false);
    expect(llamadaActiva(llamada({ terminadaEn: hace(5) }), AHORA)).toBe(false);
  });

  it("recién empezada cuenta aunque aún no haya latidos", () => {
    expect(llamadaActiva(llamada({ empezadaEn: hace(5), presentes: [] }), AHORA)).toBe(true);
  });

  it("una de hace más de 8 horas se da por terminada", () => {
    expect(llamadaActiva(llamada({ empezadaEn: hace(9 * 3600) }), AHORA)).toBe(false);
  });
});

describe("a quién le suena «te llama»", () => {
  const nueva = llamada({ empezadaEn: hace(30) });
  it("a los demás, al principio", () => {
    expect(debeSonar(nueva, DANI, AHORA)).toBe(true);
  });
  it("nunca a quien llama ni a quien ya está dentro", () => {
    expect(debeSonar(nueva, JESSE, AHORA)).toBe(false);
    const conDani = {
      ...nueva,
      presentes: [...nueva.presentes, { usuarioId: DANI, nombre: "Dani", vistoEn: hace(5) }],
    };
    expect(debeSonar(conDani, DANI, AHORA)).toBe(false);
  });
  it("deja de sonar a los 2 minutos o si se cuelga", () => {
    expect(debeSonar(llamada({ empezadaEn: hace(180) }), DANI, AHORA)).toBe(false);
    expect(debeSonar({ ...nueva, terminadaEn: hace(1) }, DANI, AHORA)).toBe(false);
  });
});

describe("salas", () => {
  it("el nombre es largo, al azar y solo con letras y números", () => {
    const sala = nombreSala("0123456789abcdef0123456789ABCDEF");
    expect(sala).toBe("valentia0123456789abcdef01234567");
    expect(esNombreSala(sala)).toBe(true);
    expect(() => nombreSala("corto")).toThrow();
    expect(esNombreSala("valentia../../x")).toBe(false);
  });
});

describe("servicio de vídeo según las variables", () => {
  it("sin claves de JaaS: meet.jit.si en otra pestaña", () => {
    expect(servicioVideo({})).toEqual({ modo: "pestana", dominio: "meet.jit.si" });
  });

  it("con las tres claves de JaaS: dentro de la web (y la clave admite \\n escritos)", () => {
    const s = servicioVideo({
      JAAS_APP_ID: "vpaas-magic-cookie-abc123",
      JAAS_KID: "vpaas-magic-cookie-abc123/9f8e7d",
      JAAS_CLAVE_PRIVADA: "-----BEGIN PRIVATE KEY-----\\nAAAA\\n-----END PRIVATE KEY-----",
    });
    expect(s.modo).toBe("incrustada");
    if (s.modo === "incrustada") expect(s.clavePrivada).toContain("\nAAAA\n");
  });

  it("con claves a medias o mal copiadas, no se usa JaaS", () => {
    expect(
      servicioVideo({ JAAS_APP_ID: "vpaas-magic-cookie-abc123", JAAS_KID: "otra/9f8e7d" }).modo,
    ).toBe("pestana");
  });

  it("la dirección lleva el pase de JaaS y los ajustes en español", () => {
    const sala = nombreSala("f".repeat(24));
    const jaas = direccionSala(
      {
        modo: "incrustada",
        dominio: "8x8.vc",
        appId: "vpaas-magic-cookie-abc",
        kid: "x",
        clavePrivada: "x",
      },
      sala,
      "Jesse",
      "a.b.c",
    );
    expect(jaas.startsWith(`https://8x8.vc/vpaas-magic-cookie-abc/${sala}?jwt=a.b.c#`)).toBe(true);
    expect(jaas).toContain("config.defaultLanguage=%22es%22");
    const gratis = direccionSala({ modo: "pestana", dominio: "meet.jit.si" }, sala, "Dani");
    expect(gratis.startsWith(`https://meet.jit.si/${sala}#`)).toBe(true);
    expect(gratis).toContain("userInfo.displayName=%22Dani%22");
  });
});

describe("pase de JaaS (JWT)", () => {
  it("se firma con la clave privada y se comprueba con la pública", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const datos = datosJwtJaas({
      appId: "vpaas-magic-cookie-abc",
      sala: "valentiaabcdefabcdefabcdef",
      usuario: { id: JESSE, nombre: "Jesse" },
      ahora: AHORA,
    });
    const jwt = firmarJwt(datos, "vpaas-magic-cookie-abc/123", pem);
    const [cabecera, cuerpo, firma] = jwt.split(".");
    expect(JSON.parse(Buffer.from(cabecera, "base64url").toString())).toEqual({
      alg: "RS256",
      kid: "vpaas-magic-cookie-abc/123",
      typ: "JWT",
    });
    const leido = JSON.parse(Buffer.from(cuerpo, "base64url").toString());
    expect(leido).toMatchObject({
      aud: "jitsi",
      sub: "vpaas-magic-cookie-abc",
      room: "valentiaabcdefabcdefabcdef",
    });
    expect(leido.context.user.name).toBe("Jesse");
    expect(leido.exp).toBeGreaterThan(leido.iat);
    const valida = createVerify("RSA-SHA256")
      .update(`${cabecera}.${cuerpo}`)
      .verify(publicKey, Buffer.from(firma, "base64url"));
    expect(valida).toBe(true);
  });
});

describe("textos", () => {
  it("quién está dentro", () => {
    expect(textoPresentes([])).toBe("Nadie todavía");
    expect(textoPresentes(["Jesse", "Dani"])).toBe("Jesse y Dani");
    expect(textoPresentes(["Jesse", "Dani", "Marina", "Alonso"])).toBe("Jesse, Dani y 2 más");
  });

  it("el aviso push: en un grupo y en un privado", () => {
    expect(avisoDeLlamada({ id: "1", de: "Jesse", ruta: "general" })).toMatchObject({
      titulo: "📹 Jesse · General",
      url: "/mensajes/general?llamada=1",
    });
    expect(avisoDeLlamada({ id: "1", de: "Dani", ruta: DANI }).titulo).toBe("📹 Dani te llama");
  });
});
