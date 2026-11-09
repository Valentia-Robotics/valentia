/**
 * LÍMITE DE INTENTOS
 * Evita que alguien pruebe miles de contraseñas o códigos seguidos.
 * Cuenta los intentos de cada "clave" (por ejemplo, la IP + el email) en una ventana de
 * tiempo y, si se pasa del máximo, los rechaza hasta que empieza la ventana siguiente.
 *
 * Los contadores se guardan en la BASE DE DATOS (tabla LimiteIntento), así funciona igual con
 * un servidor que con muchos (hosting "serverless" como Vercel). De la clave solo se guarda
 * una huella (hash): ni las IP ni los emails quedan escritos tal cual.
 */
import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/** Límites de cada acción. Cámbialos aquí. */
export const LIMITES = {
  /** Iniciar sesión (por IP + email) */
  login: { maximo: 10, minutos: 15 },
  /** Iniciar sesión en una misma cuenta desde cualquier IP: frena los ataques repartidos entre muchas */
  loginCuenta: { maximo: 50, minutos: 60 },
  /** Crear cuenta (por IP) */
  registro: { maximo: 5, minutos: 60 },
  /** Escribir el código de 6 cifras (por IP; además, 5 intentos por código) */
  verificarCodigo: { maximo: 30, minutos: 15 },
  /** Pedir otro código (por IP; además, 5 códigos por email y hora) */
  reenviarCodigo: { maximo: 10, minutos: 15 },
  /** Activar un código de kit (por usuario) */
  activar: { maximo: 15, minutos: 15 },
  /** Consultar si existe un código en /activar (por IP) */
  consultarCodigo: { maximo: 40, minutos: 15 },
  /** Cambiar la contraseña desde "Mi cuenta" (por usuario) */
  cambiarContrasena: { maximo: 5, minutos: 15 },
  /** Pedir un código de "¿Olvidaste tu contraseña?" (por IP; además, máximo 5 códigos por email y hora) */
  recuperar: { maximo: 10, minutos: 15 },
  /** Preparar un pedido en el checkout (por IP): evita bloquear el stock con pedidos falsos */
  checkout: { maximo: 20, minutos: 15 },
  /** Apuntarse a la lista de espera (por IP) */
  listaEspera: { maximo: 10, minutos: 60 },
  /** Páginas vistas que se cuentan en las estadísticas (por IP) */
  visita: { maximo: 120, minutos: 10 },
  /** Escribir o cambiar una reseña (por usuario): cada una vuelve a generar las páginas de la tienda */
  resena: { maximo: 10, minutos: 60 },
  /** Peticiones de n8n para crear guiones: si el flujo entra en bucle, no llena el panel */
  guionApi: { maximo: 30, minutos: 60 },
  /** Llamadas a la API de guiones con la clave mal (por IP): solo para no llenar el registro */
  guionApiFallos: { maximo: 30, minutos: 60 },
  /** Peticiones de n8n a la API del blog (con la clave buena) */
  blogApi: { maximo: 60, minutos: 60 },
  /** Llamadas a la API del blog con la clave mal (por IP): solo para no llenar el registro */
  blogApiFallos: { maximo: 30, minutos: 60 },
  /** Archivos subidos a los espacios de hardware (por persona) */
  hardwareSubida: { maximo: 300, minutos: 60 },
} as const;

export type AccionLimitada = keyof typeof LIMITES;

function huella(texto: string) {
  return createHash("sha256").update(texto).digest("base64url").slice(0, 32);
}

/**
 * Apunta un intento y dice si está permitido.
 * Devuelve false si ya se ha superado el máximo en la ventana de tiempo actual.
 * Si la base de datos falla, deja pasar (mejor que bloquear a todo el mundo) y lo apunta.
 */
export async function registrarIntento(accion: AccionLimitada, clave: string): Promise<boolean> {
  const { maximo, minutos } = LIMITES[accion];
  const duracion = minutos * 60_000;
  const ahora = Date.now();
  const ventana = Math.floor(ahora / duracion);
  const id = `${accion}:${huella(clave)}:${ventana}`;

  try {
    const sumar = () =>
      db.limiteIntento.upsert({
        where: { id },
        create: { id, contador: 1, caducaEn: new Date((ventana + 1) * duracion) },
        update: { contador: { increment: 1 } },
      });
    // Si dos peticiones crean el contador a la vez, MongoDB rechaza una (clave duplicada):
    // al repetirla, el contador ya existe y simplemente se suma
    const fila = await sumar().catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        return sumar();
      throw error;
    });

    // Limpieza de vez en cuando (1 de cada 50 llamadas) para que la tabla no crezca sin fin
    if (Math.random() < 0.02) {
      await db.limiteIntento.deleteMany({ where: { caducaEn: { lt: new Date(ahora) } } });
    }
    return fila.contador <= maximo;
  } catch (error) {
    console.error("Límite de intentos: no se ha podido consultar la base de datos.", error);
    return true;
  }
}

/**
 * La IP de quien hace la petición. Detrás de un proveedor de hosting (Vercel, Cloudflare…) la
 * pone el propio proveedor en una cabecera de confianza; "x-forwarded-for" se usa como último
 * recurso (la puede inventar el navegador si la web no está detrás de un proxy: ver SEGURIDAD.md).
 */
export function ipDeCabeceras(cabeceras: Headers): string {
  return (
    cabeceras.get("cf-connecting-ip") ||
    cabeceras.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    cabeceras.get("x-real-ip") ||
    cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

/** La IP de quien hace la petición actual (en páginas y acciones del servidor) */
export async function ipDelCliente(): Promise<string> {
  return ipDeCabeceras(await headers());
}
