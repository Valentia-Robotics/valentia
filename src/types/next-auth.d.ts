// Le dice a TypeScript que la sesión de Auth.js siempre lleva el id del usuario.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
