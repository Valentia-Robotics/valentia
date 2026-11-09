// Le dice a TypeScript qué lleva la sesión de Auth.js: el id del usuario y su rol.
// El rol de la sesión solo se usa para enseñar (o no) el enlace al panel en el menú;
// los permisos de verdad se comprueban siempre con la base de datos (src/lib/sesion.ts).
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; rol?: "CLIENTE" | "ADMIN" | "EDITOR" | "HARDWARE" } & DefaultSession["user"];
  }
  interface User {
    rol?: "CLIENTE" | "ADMIN" | "EDITOR" | "HARDWARE";
    /** El dispositivo de confianza al que va unida la sesión */
    dispositivoId?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    rol?: "CLIENTE" | "ADMIN" | "EDITOR" | "HARDWARE";
    dispositivoId?: string;
    /** Cuándo se abrió la sesión (milisegundos): al cerrar sesión, las anteriores dejan de valer */
    abiertaEn?: number;
  }
}
