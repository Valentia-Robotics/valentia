/**
 * PROXY (antes llamado "middleware")
 * Se ejecuta antes de cada página. Si intentas entrar en una zona protegida
 * (por ejemplo /cursos) sin haber iniciado sesión, te lleva a /login y,
 * al entrar, te devuelve a donde ibas.
 *
 * Es solo un primer filtro rápido: cada página y cada acción vuelve a comprobar
 * la sesión con la base de datos (ver src/lib/sesion.ts).
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // No hace falta pasar por aquí para archivos estáticos ni imágenes. Tampoco por /api: así
  // /api/health (Render) y el webhook de Stripe nunca piden sesión ni redirigen.
  matcher: [
    "/((?!api|_next/static|_next/image|images|subidas|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)",
  ],
};
