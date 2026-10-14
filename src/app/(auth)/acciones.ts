"use server";

/**
 * CREAR CUENTA (en el servidor)
 * Valida los datos, cifra la contraseña y guarda el usuario.
 * El inicio de sesión lo hace después el navegador con Auth.js.
 */
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { ipDelCliente, registrarIntento } from "@/lib/limite";
import { esquemaRegistro } from "@/lib/validaciones/cuenta";

export interface EstadoRegistro {
  ok: boolean;
  mensaje?: string;
  errores?: Partial<Record<"nombre" | "email" | "contrasena", string>>;
}

export async function registrarse(formulario: FormData): Promise<EstadoRegistro> {
  const datos = esquemaRegistro.safeParse({
    nombre: formulario.get("nombre"),
    email: formulario.get("email"),
    contrasena: formulario.get("contrasena"),
  });
  if (!datos.success) {
    const { fieldErrors } = z.flattenError(datos.error);
    return {
      ok: false,
      errores: Object.fromEntries(
        Object.entries(fieldErrors).map(([campo, mensajes]) => [campo, mensajes?.[0]]),
      ),
    };
  }

  const { nombre, email, contrasena } = datos.data;
  if (await db.usuario.findUnique({ where: { email }, select: { id: true } })) {
    return {
      ok: false,
      errores: { email: "Ya hay una cuenta con este email. ¿Quieres iniciar sesión?" },
    };
  }

  // Máximo de cuentas nuevas por IP; solo cuentan las que se crean de verdad (ver src/lib/limite.ts)
  if (!registrarIntento("registro", await ipDelCliente())) {
    return {
      ok: false,
      mensaje: "Se han creado muchas cuentas desde aquí. Espera un rato y vuelve a intentarlo.",
    };
  }

  // Cifrado con bcrypt (10 rondas): aunque alguien viera la base de datos, no podría leer la contraseña
  const contrasenaHash = await bcrypt.hash(contrasena, 10);
  try {
    await db.usuario.create({ data: { nombre, email, contrasenaHash } });
  } catch {
    // Por si dos personas se registran con el mismo email a la vez
    return { ok: false, errores: { email: "Ya hay una cuenta con este email." } };
  }
  return { ok: true };
}
