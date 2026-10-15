/**
 * CONFIGURACIÓN BÁSICA DE AUTH.JS (sin base de datos)
 * La usa proxy.ts, que se ejecuta en cada visita, así que aquí no se consulta
 * la base de datos: solo se lee la sesión guardada en la cookie (cifrada).
 * La configuración completa (comprobar la contraseña) está en src/auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

/** Rutas que necesitan haber iniciado sesión */
export const RUTAS_PROTEGIDAS = ["/cursos", "/cuenta", "/admin"];

export const authConfig = {
  // Nuestras propias páginas en lugar de las que trae Auth.js
  pages: { signIn: "/login" },
  // La sesión se guarda en una cookie cifrada (JWT) durante 30 días
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  // Necesario para "npm start" fuera de servicios como Vercel
  trustHost: true,
  providers: [], // se añaden en src/auth.ts
  callbacks: {
    /** proxy.ts: si la ruta está protegida y no hay sesión, manda a /login (y luego vuelve) */
    authorized({ auth, request }) {
      const protegida = RUTAS_PROTEGIDAS.some(
        (ruta) =>
          request.nextUrl.pathname === ruta || request.nextUrl.pathname.startsWith(`${ruta}/`),
      );
      return !protegida || Boolean(auth?.user);
    },
    /**
     * Guardamos el id, el rol y el dispositivo del usuario en la sesión (el nombre y el email
     * ya van por defecto). En src/auth.ts se añade la comprobación con la base de datos.
     */
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user?.rol) token.rol = user.rol;
      if (user?.dispositivoId) token.dispositivoId = user.dispositivoId;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.rol = token.rol;
      return session;
    },
  },
} satisfies NextAuthConfig;
