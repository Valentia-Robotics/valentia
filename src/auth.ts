/**
 * AUTH.JS (sesiones)
 * Exporta:
 *   auth()    → la sesión actual (en páginas y acciones del servidor)
 *   handlers  → las rutas /api/auth/* que usa Auth.js
 *   signIn()  → abrir la sesión (solo desde src/lib/verificacion/entrar.ts)
 *   signOut() → cerrar sesión desde el servidor
 *
 * La contraseña y los códigos por email se comprueban ANTES, en las acciones de
 * src/app/(auth). Auth.js solo recibe un "pase" de un solo uso que dura 60 segundos
 * y lo convierte en la sesión (ver src/lib/verificacion/dispositivos.ts).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { canjearPase, comprobarSesion } from "@/lib/verificacion/dispositivos";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { pase: {} },
      /** Canjea el pase por el usuario y su dispositivo. null si el pase no vale. */
      async authorize(credenciales) {
        if (typeof credenciales.pase !== "string" || credenciales.pase.length > 100) return null;
        const canjeado = await canjearPase(credenciales.pase);
        if (!canjeado) return null;
        const { usuario, dispositivoId } = canjeado;
        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          dispositivoId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Cada vez que se lee la sesión, comprobamos en la base de datos que su dispositivo
     * sigue siendo de confianza. Si no (lo has borrado en "Mis dispositivos", has cambiado
     * la contraseña, ha caducado…), devolvemos null: la sesión se cierra.
     */
    async jwt(parametros) {
      const token = authConfig.callbacks.jwt(parametros);
      if (parametros.user) return token; // la sesión se acaba de abrir
      if (!token.sub || !token.dispositivoId) return null;
      const rol = await comprobarSesion(token.sub, token.dispositivoId);
      if (!rol) return null;
      token.rol = rol; // así el menú se entera al momento si cambia el rol
      return token;
    },
  },
});
