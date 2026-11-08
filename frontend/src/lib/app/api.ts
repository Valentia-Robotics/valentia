/**
 * API DE LA APP DEL MÓVIL (/api/app/*)
 * Trabaja con Request y Response normales: la usan las rutas de la web y backend/ por igual.
 *
 *   POST /api/app/entrar     { email, contrasena }      → envía un código al email → { verificacion }
 *   POST /api/app/verificar  { verificacion, codigo }   → { token, usuario }  (token = sesión del móvil)
 *   POST /api/app/reenviar   { verificacion }           → otro código
 *   GET  /api/app/yo                                     → usuario y sus kits (con lo que desbloquea cada uno)
 *   POST /api/app/activar    { codigo }                 → activa el código del kit (o la dirección del QR)
 *   POST /api/app/salir                                  → cierra la sesión de este móvil
 *
 * Las mismas reglas que la web: contraseña cifrada, código por email en cada móvil nuevo, límites de
 * intentos y mensajes que nunca dicen si un email tiene cuenta. Crear la cuenta se hace en la web.
 */
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { z } from "zod";
import { funcionesDeKit } from "@/config/app";
import { activarCodigo } from "@/lib/activacion";
import { normalizarCodigo } from "@/lib/codigos";
import { enviarCorreo } from "@/lib/correo";
import { plantillaNuevoDispositivo } from "@/lib/correo/plantillas";
import { leerCuerpo } from "@/lib/cuerpoLimitado";
import { db } from "@/lib/db";
import { ipDeCabeceras, registrarIntento } from "@/lib/limite";
import {
  codigoDeTexto,
  esquemaActivarApp,
  esquemaEntrarApp,
  esquemaReenviarApp,
  esquemaVerificarApp,
} from "@/lib/validaciones/app";
import {
  comprobarCodigo,
  empezarVerificacion,
  reenviarCodigo,
  terminarVerificacion,
} from "@/lib/verificacion/codigos";
import { cerrarSesionApp, crearSesionApp, nombreMovil, usuarioDeLaApp } from "./sesionApp";

/** Lo que manda la app es poco: un email, una contraseña o un código */
const TAMANO_MAXIMO = 4 * 1024;

const DEMASIADOS = "Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.";
const ERROR_GENERICO = "Algo ha fallado. Inténtalo de nuevo en unos segundos.";
const SIN_SESION = "Tu sesión ha terminado. Vuelve a entrar.";

/** Ver src/app/(auth)/acciones.ts: si el email no existe, se compara igual (misma espera) */
const HUELLA_FALSA = bcrypt.hashSync("contraseña-que-nadie-tiene", 10);

const respuesta = (status: number, cuerpo: Record<string, unknown>) =>
  Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

const error = (status: number, mensaje: string, extra: Record<string, unknown> = {}) =>
  respuesta(status, { ok: false, mensaje, ...extra });

/** Lee y valida el cuerpo JSON. Devuelve los datos o la respuesta de error. */
async function leer<T extends z.ZodType>(
  peticion: Request,
  esquema: T,
): Promise<{ datos: z.infer<T> } | { fallo: Response }> {
  const texto = await leerCuerpo(peticion, TAMANO_MAXIMO);
  if (texto === null) return { fallo: error(413, "La petición es demasiado grande.") };
  let json: unknown;
  try {
    json = JSON.parse(texto || "{}");
  } catch {
    return { fallo: error(400, "La petición no se entiende.") };
  }
  const resultado = esquema.safeParse(json);
  if (!resultado.success) {
    return { fallo: error(400, resultado.error.issues[0]?.message ?? "Revisa los datos.") };
  }
  return { datos: resultado.data };
}

/** Dirección pública de la web (para las fotos y los enlaces a los cursos) */
function webPublica(peticion: Request): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(peticion.url).origin).replace(/\/$/, "");
}

/**
 * Foto del kit para la app: la PNG de «compartir en redes» si existe (las SVG de la web llevan la
 * foto dentro y no todos los móviles las dibujan bien); si no, la imagen del kit tal cual.
 */
function fotoDelKit(slug: string, imagen: string): string {
  const archivo = path.join("images", "redes", "kits", `${slug}.png`);
  const carpetas = [
    path.join(/* turbopackIgnore: true */ process.cwd(), "public"),
    path.join(/* turbopackIgnore: true */ process.cwd(), "..", "frontend", "public"),
  ];
  return carpetas.some((c) => existsSync(path.join(c, archivo))) ? `/${archivo}` : imagen;
}

/** Los kits que ha desbloqueado un usuario (los cursos que tiene), con su progreso y funciones */
async function kitsDelUsuario(usuarioId: string, web: string) {
  const [kits, hechas] = await Promise.all([
    db.kit.findMany({
      where: { curso: { alumnos: { some: { usuarioId } } } },
      orderBy: { orden: "asc" },
      select: {
        slug: true,
        nombre: true,
        eslogan: true,
        imagen: true,
        curso: {
          select: { id: true, slug: true, titulo: true, _count: { select: { lecciones: true } } },
        },
      },
    }),
    db.progresoLeccion.findMany({
      where: { usuarioId },
      select: { leccion: { select: { cursoId: true } } },
    }),
  ]);
  return kits.map((kit) => {
    const total = kit.curso._count.lecciones;
    const completadas = hechas.filter((h) => h.leccion.cursoId === kit.curso.id).length;
    const foto = fotoDelKit(kit.slug, kit.imagen);
    return {
      slug: kit.slug,
      nombre: kit.nombre,
      eslogan: kit.eslogan,
      foto: foto.startsWith("/") ? `${web}${foto}` : foto,
      curso: {
        titulo: kit.curso.titulo,
        url: `${web}/cursos/${kit.curso.slug}`,
        lecciones: total,
        completadas: Math.min(completadas, total),
      },
      funciones: funcionesDeKit(kit.slug),
    };
  });
}

// ---------------------------------------------------------------------------
// Entrar: contraseña → código por email → token del móvil
// ---------------------------------------------------------------------------

export async function entrarApp(peticion: Request): Promise<Response> {
  const leido = await leer(peticion, esquemaEntrarApp);
  if ("fallo" in leido) return leido.fallo;
  const { email, contrasena } = leido.datos;

  const [porIp, porCuenta] = await Promise.all([
    registrarIntento("login", `${ipDeCabeceras(peticion.headers)}:${email}`),
    registrarIntento("loginCuenta", email),
  ]);
  if (!porIp || !porCuenta) return error(429, DEMASIADOS);

  try {
    const usuario = await db.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, contrasenaHash: true, emailVerificadoEn: true },
    });
    const correcta = await bcrypt.compare(contrasena, usuario?.contrasenaHash ?? HUELLA_FALSA);
    if (!usuario || !correcta) return error(401, "El email o la contraseña no son correctos.");

    // Cada móvil nuevo confirma con un código (igual que un navegador nuevo). Si el email aún
    // no estaba verificado, el mismo código lo verifica.
    const resultado = await empezarVerificacion({
      email,
      motivo: usuario.emailVerificadoEn ? "DISPOSITIVO" : "REGISTRO",
      usuario,
      sinCookie: true,
    });
    if (!resultado.ok) return error(429, resultado.mensaje);
    return respuesta(200, { ok: true, verificacion: resultado.token, email });
  } catch (fallo) {
    console.error("[app] Error al entrar:", fallo);
    return error(500, ERROR_GENERICO);
  }
}

export async function verificarApp(peticion: Request): Promise<Response> {
  const leido = await leer(peticion, esquemaVerificarApp);
  if ("fallo" in leido) return leido.fallo;
  const { verificacion, codigo, sistema } = leido.datos;

  if (!(await registrarIntento("verificarCodigo", ipDeCabeceras(peticion.headers)))) {
    return error(429, DEMASIADOS);
  }

  const resultado = await comprobarCodigo(codigo, verificacion);
  switch (resultado.estado) {
    case "incorrecto":
      return error(400, `El código no es correcto. Te quedan ${resultado.restantes} intentos.`, {
        tipo: "incorrecto",
      });
    case "caducado":
      return error(400, "Este código ha caducado. Pide otro.", { tipo: "caducado" });
    case "agotado":
      return error(400, "Has escrito mal el código demasiadas veces. Pide otro.", {
        tipo: "agotado",
      });
    case "sin-verificacion":
      return error(400, "Vuelve a iniciar sesión.", { tipo: "reiniciar" });
  }

  const { id, usuarioId, motivo } = resultado.verificacion;
  // Un código de «¿Olvidaste tu contraseña?» no abre sesión en la app
  if (motivo === "RECUPERAR") return error(400, "Vuelve a iniciar sesión.", { tipo: "reiniciar" });

  try {
    if (!(await terminarVerificacion(id, true))) {
      return error(400, "Este código ya se ha usado. Vuelve a iniciar sesión.", {
        tipo: "reiniciar",
      });
    }
    const usuario = await db.usuario.update({
      where: { id: usuarioId },
      data: motivo === "REGISTRO" ? { emailVerificadoEn: new Date() } : {},
      select: { id: true, nombre: true, email: true },
    });
    const { token, dispositivo } = await crearSesionApp(usuario.id, nombreMovil(sistema));

    // Aviso por email, como con un navegador nuevo: si no era el dueño, sabrá que alguien tiene su contraseña
    if (motivo === "DISPOSITIVO") {
      await enviarCorreo(
        plantillaNuevoDispositivo({
          para: usuario.email,
          nombre: usuario.nombre,
          dispositivo: dispositivo.nombre,
          fecha: new Date(),
        }),
      );
    }
    return respuesta(200, {
      ok: true,
      token,
      usuario: { nombre: usuario.nombre, email: usuario.email },
    });
  } catch (fallo) {
    console.error("[app] Error al confirmar el código:", fallo);
    return error(500, ERROR_GENERICO, { tipo: "reiniciar" });
  }
}

export async function reenviarApp(peticion: Request): Promise<Response> {
  const leido = await leer(peticion, esquemaReenviarApp);
  if ("fallo" in leido) return leido.fallo;
  if (!(await registrarIntento("reenviarCodigo", ipDeCabeceras(peticion.headers)))) {
    return error(429, DEMASIADOS);
  }
  const resultado = await reenviarCodigo(leido.datos.verificacion);
  return resultado.ok
    ? respuesta(200, { ok: true, espera: resultado.espera })
    : error(429, resultado.mensaje, { espera: resultado.espera });
}

// ---------------------------------------------------------------------------
// Con sesión: mis kits, activar un código y salir
// ---------------------------------------------------------------------------

export async function yoApp(peticion: Request): Promise<Response> {
  const usuario = await usuarioDeLaApp(peticion);
  if (!usuario) return error(401, SIN_SESION);
  const kits = await kitsDelUsuario(usuario.id, webPublica(peticion));
  return respuesta(200, {
    ok: true,
    usuario: { nombre: usuario.nombre, email: usuario.email },
    kits,
  });
}

const MENSAJES_ACTIVAR = {
  usado: "Este código ya lo ha usado otra cuenta.",
  desactivado: "Este código ya no está activo. Escríbenos y lo miramos.",
  "no-existe": "No encontramos ese código. Revisa que esté bien escrito.",
} as const;

export async function activarApp(peticion: Request): Promise<Response> {
  const usuario = await usuarioDeLaApp(peticion);
  if (!usuario) return error(401, SIN_SESION);
  const leido = await leer(peticion, esquemaActivarApp);
  if ("fallo" in leido) return leido.fallo;

  if (!(await registrarIntento("activar", usuario.id))) return error(429, DEMASIADOS);

  const codigo = normalizarCodigo(codigoDeTexto(leido.datos.codigo));
  const resultado = await activarCodigo(usuario.id, codigo);
  if (resultado.estado !== "activado" && resultado.estado !== "ya-tienes") {
    return error(400, MENSAJES_ACTIVAR[resultado.estado], { estado: resultado.estado });
  }

  const kits = await kitsDelUsuario(usuario.id, webPublica(peticion));
  const kit = await db.kit.findFirst({
    where: { curso: { slug: resultado.cursoSlug } },
    select: { slug: true },
  });
  return respuesta(200, { ok: true, estado: resultado.estado, kit: kit?.slug ?? null, kits });
}

export async function salirApp(peticion: Request): Promise<Response> {
  const usuario = await usuarioDeLaApp(peticion);
  if (usuario) await cerrarSesionApp(usuario);
  return respuesta(200, { ok: true });
}
