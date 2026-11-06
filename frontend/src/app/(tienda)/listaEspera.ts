"use server";

/**
 * LISTA DE ESPERA: apuntarse para recibir un correo el día que abra la tienda.
 * Sin cuenta. Si el email ya estaba, no se duplica (y se responde igual, para no desvelar quién está).
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { ipDelCliente, registrarIntento } from "@/lib/limite";

export interface EstadoListaEspera {
  ok: boolean;
  mensaje?: string;
  /** El email escrito: para el mensaje de gracias o para no borrarlo si hay un error */
  email?: string;
}

const esquema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email("Ese email no parece correcto. ¿Lo revisas?")),
  origen: z.enum(["portada", "kit", "checkout"]),
  kitSlug: z
    .string()
    .regex(/^[a-z0-9-]{1,80}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function apuntarseListaEspera(
  _anterior: EstadoListaEspera,
  formulario: FormData,
): Promise<EstadoListaEspera> {
  const leer = (campo: string) => {
    const valor = formulario.get(campo);
    return typeof valor === "string" ? valor : "";
  };

  // Campo trampa: invisible para las personas; si viene relleno, es un programa automático
  if (leer("web")) return { ok: true, email: leer("email") };

  const datos = esquema.safeParse({
    email: leer("email"),
    origen: leer("origen"),
    kitSlug: leer("kitSlug"),
  });
  if (!datos.success) {
    const fallo = datos.error.issues.find((i) => i.path[0] === "email");
    return {
      ok: false,
      mensaje: fallo?.message ?? "Algo no ha ido bien. Prueba otra vez.",
      email: leer("email"),
    };
  }
  if (!(await registrarIntento("listaEspera", await ipDelCliente()))) {
    return {
      ok: false,
      mensaje: "Demasiados intentos seguidos. Prueba dentro de un rato.",
      email: leer("email"),
    };
  }

  const { email, origen, kitSlug } = datos.data;
  try {
    await db.listaEspera.create({ data: { email, origen, kitSlug } });
  } catch {
    // Ya estaba apuntado (email único): no pasa nada
  }
  return { ok: true, email };
}
