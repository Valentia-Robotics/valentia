/**
 * API de la app del móvil (BD, correo y códigos simulados): entrar, código, sesión y activar.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { codigoDeTexto } from "@/lib/validaciones/app";

vi.mock("server-only", () => ({}));

const bd = vi.hoisted(() => ({
  usuario: { findUnique: vi.fn(), update: vi.fn() },
  dispositivoConfianza: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  kit: { findMany: vi.fn(), findFirst: vi.fn() },
  progresoLeccion: { findMany: vi.fn() },
}));
const codigos = vi.hoisted(() => ({
  empezarVerificacion: vi.fn(),
  comprobarCodigo: vi.fn(),
  reenviarCodigo: vi.fn(),
  terminarVerificacion: vi.fn(),
}));
const activacion = vi.hoisted(() => ({ activarCodigo: vi.fn() }));
const correo = vi.hoisted(() => ({ enviarCorreo: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: bd }));
vi.mock("@/lib/verificacion/codigos", () => codigos);
vi.mock("@/lib/activacion", () => activacion);
vi.mock("@/lib/correo", () => correo);
vi.mock("@/lib/limite", () => ({
  registrarIntento: vi.fn().mockResolvedValue(true),
  ipDeCabeceras: () => "1.2.3.4",
}));

import bcrypt from "bcryptjs";
import { activarApp, entrarApp, verificarApp, yoApp } from "./api";
import { hashToken } from "@/lib/verificacion/cripto";

const TOKEN = "a".repeat(43);
const VERIF = "b".repeat(43);

const post = (ruta: string, cuerpo: unknown, token?: string) =>
  new Request(`https://valentia.test/api/app/${ruta}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(cuerpo),
  });

const sesionValida = () =>
  bd.dispositivoConfianza.findUnique.mockResolvedValue({
    id: "d1",
    caducaEn: new Date(Date.now() + 86_400_000),
    ultimoUsoEn: new Date(),
    sesionCerradaEn: null,
    usuario: { id: "u1", nombre: "Ana", email: "ana@valentia.test", emailVerificadoEn: new Date() },
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = "secreto-de-prueba";
  process.env.NEXT_PUBLIC_SITE_URL = "https://valentia.test";
  bd.kit.findMany.mockResolvedValue([]);
  bd.progresoLeccion.findMany.mockResolvedValue([]);
});

describe("codigoDeTexto", () => {
  it("saca el código de la dirección del QR", () => {
    expect(codigoDeTexto("https://valentiarobotics.com/activar?codigo=VAL-7KQ2-M9XD")).toBe(
      "VAL-7KQ2-M9XD",
    );
  });
  it("lo escrito a mano pasa tal cual", () => {
    expect(codigoDeTexto(" val 7kq2 m9xd ")).toBe("val 7kq2 m9xd");
  });
});

describe("entrar", () => {
  it("contraseña mal → 401 sin decir si el email existe", async () => {
    bd.usuario.findUnique.mockResolvedValue(null);
    const r = await entrarApp(post("entrar", { email: "nadie@valentia.test", contrasena: "x" }));
    expect(r.status).toBe(401);
    expect(codigos.empezarVerificacion).not.toHaveBeenCalled();
  });

  it("contraseña bien → envía el código y devuelve la verificación, sin cookie", async () => {
    bd.usuario.findUnique.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      contrasenaHash: await bcrypt.hash("robots2026", 4),
      emailVerificadoEn: new Date(),
    });
    codigos.empezarVerificacion.mockResolvedValue({ ok: true, token: VERIF });
    const r = await entrarApp(
      post("entrar", { email: "ana@valentia.test", contrasena: "robots2026" }),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).verificacion).toBe(VERIF);
    expect(codigos.empezarVerificacion).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: "DISPOSITIVO", sinCookie: true }),
    );
  });
});

describe("verificar", () => {
  it("código bien → crea la sesión del móvil y guarda solo la huella del token", async () => {
    codigos.comprobarCodigo.mockResolvedValue({
      estado: "correcto",
      verificacion: { id: "v1", usuarioId: "u1", motivo: "DISPOSITIVO" },
    });
    codigos.terminarVerificacion.mockResolvedValue(true);
    bd.usuario.update.mockResolvedValue({ id: "u1", nombre: "Ana", email: "ana@valentia.test" });
    bd.dispositivoConfianza.create.mockResolvedValue({
      id: "d1",
      nombre: "App Valentia en Android",
    });

    const r = await verificarApp(
      post("verificar", { verificacion: VERIF, codigo: "123456", sistema: "android" }),
    );
    const cuerpo = await r.json();
    expect(r.status).toBe(200);
    expect(codigos.comprobarCodigo).toHaveBeenCalledWith("123456", VERIF);
    const guardado = bd.dispositivoConfianza.create.mock.calls[0][0].data;
    expect(guardado.tokenHash).toBe(hashToken(cuerpo.token));
    expect(guardado.nombre).toBe("App Valentia en Android");
    expect(correo.enviarCorreo).toHaveBeenCalledOnce();
  });

  it("un código de recuperar contraseña no abre sesión", async () => {
    codigos.comprobarCodigo.mockResolvedValue({
      estado: "correcto",
      verificacion: { id: "v1", usuarioId: "u1", motivo: "RECUPERAR" },
    });
    const r = await verificarApp(post("verificar", { verificacion: VERIF, codigo: "123456" }));
    expect(r.status).toBe(400);
    expect(bd.dispositivoConfianza.create).not.toHaveBeenCalled();
  });
});

describe("con sesión", () => {
  it("sin token o con uno cerrado → 401", async () => {
    expect((await yoApp(new Request("https://valentia.test/api/app/yo"))).status).toBe(401);
    bd.dispositivoConfianza.findUnique.mockResolvedValue({
      id: "d1",
      caducaEn: new Date(Date.now() + 86_400_000),
      ultimoUsoEn: new Date(),
      sesionCerradaEn: new Date(),
      usuario: { id: "u1", nombre: "Ana", email: "a@b.c", emailVerificadoEn: new Date() },
    });
    const r = await yoApp(
      new Request("https://valentia.test/api/app/yo", {
        headers: { authorization: `Bearer ${TOKEN}` },
      }),
    );
    expect(r.status).toBe(401);
  });

  it("mis kits: progreso del curso y funciones del kit", async () => {
    sesionValida();
    bd.kit.findMany.mockResolvedValue([
      {
        slug: "vr1-starter-kit",
        nombre: "Coche",
        eslogan: "",
        imagen: "/images/kits/vr1-starter-kit.svg",
        curso: {
          id: "c1",
          slug: "programa-tu-coche-robot",
          titulo: "Curso",
          _count: { lecciones: 5 },
        },
      },
    ]);
    bd.progresoLeccion.findMany.mockResolvedValue([
      { leccion: { cursoId: "c1" } },
      { leccion: { cursoId: "otro" } },
    ]);
    const r = await yoApp(
      new Request("https://valentia.test/api/app/yo", {
        headers: { authorization: `Bearer ${TOKEN}` },
      }),
    );
    const { kits } = await r.json();
    expect(bd.dispositivoConfianza.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashToken(TOKEN) } }),
    );
    expect(kits[0].curso).toMatchObject({ lecciones: 5, completadas: 1 });
    expect(kits[0].curso.url).toBe("https://valentia.test/cursos/programa-tu-coche-robot");
    expect(kits[0].funciones.map((f: { id: string }) => f.id)).toContain("control-remoto");
    expect(kits[0].foto.startsWith("https://valentia.test/images/")).toBe(true);
  });

  it("activar con la dirección del QR usa el código limpio", async () => {
    sesionValida();
    activacion.activarCodigo.mockResolvedValue({
      estado: "activado",
      cursoSlug: "programa-tu-coche-robot",
    });
    bd.kit.findFirst.mockResolvedValue({ slug: "vr1-starter-kit" });
    const r = await activarApp(
      post(
        "activar",
        { codigo: "https://valentiarobotics.com/activar?codigo=val-7kq2-m9xd" },
        TOKEN,
      ),
    );
    expect(r.status).toBe(200);
    expect(activacion.activarCodigo).toHaveBeenCalledWith("u1", "VAL-7KQ2-M9XD");
    expect((await r.json()).kit).toBe("vr1-starter-kit");
  });

  it("código usado por otra cuenta → 400 con su mensaje", async () => {
    sesionValida();
    activacion.activarCodigo.mockResolvedValue({ estado: "usado" });
    const r = await activarApp(post("activar", { codigo: "VAL-7KQ2-M9XD" }, TOKEN));
    expect(r.status).toBe(400);
    expect((await r.json()).estado).toBe("usado");
  });
});
