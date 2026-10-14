/**
 * AUTH.JS (inicio de sesión con email y contraseña)
 * Exporta:
 *   auth()    → la sesión actual (en páginas y acciones del servidor)
 *   handlers  → las rutas /api/auth/* que usa Auth.js
 *   signOut() → cerrar sesión desde el servidor
 */
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { ipDeCabeceras, registrarIntento } from "@/lib/limite";
import { esquemaLogin } from "@/lib/validaciones/cuenta";

/** Error que llega al navegador como código "demasiados-intentos" */
class DemasiadosIntentos extends CredentialsSignin {
  code = "demasiados-intentos";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        contrasena: { label: "Contraseña", type: "password" },
      },
      /** Comprueba el email y la contraseña. Devuelve el usuario, o null si no coinciden. */
      async authorize(credenciales, peticion) {
        const datos = esquemaLogin.safeParse(credenciales);
        if (!datos.success) return null;

        // Máximo de intentos por IP y email (ver src/lib/limite.ts)
        const clave = `${ipDeCabeceras(peticion.headers)}:${datos.data.email}`;
        if (!registrarIntento("login", clave)) throw new DemasiadosIntentos();

        const usuario = await db.usuario.findUnique({ where: { email: datos.data.email } });
        // Comparamos con el hash guardado (la contraseña nunca se guarda tal cual)
        const correcta =
          usuario !== null && (await bcrypt.compare(datos.data.contrasena, usuario.contrasenaHash));
        if (!usuario || !correcta) return null;

        return { id: usuario.id, name: usuario.nombre, email: usuario.email, rol: usuario.rol };
      },
    }),
  ],
});
