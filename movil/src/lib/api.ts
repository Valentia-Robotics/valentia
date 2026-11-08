/**
 * CONEXIÓN CON LA WEB DE VALENTIA
 * La app usa las mismas cuentas, códigos y cursos que la web: habla con sus rutas /api/app/*
 * (frontend/src/lib/app/api.ts). La dirección se cambia en app.json → extra.web, o al probar con
 * la variable EXPO_PUBLIC_WEB (por ejemplo, EXPO_PUBLIC_WEB=http://192.168.1.20:3000 npm start).
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

export const WEB: string = (
  process.env.EXPO_PUBLIC_WEB ||
  (Constants.expoConfig?.extra?.web as string | undefined) ||
  "https://valentiarobotics.com"
).replace(/\/$/, "");

export const SISTEMA =
  Platform.OS === "ios"
    ? "ios"
    : Platform.OS === "android"
      ? "android"
      : "otro";

export interface FuncionKit {
  id: string;
  titulo: string;
  descripcion: string;
  disponible: boolean;
}

export interface KitUsuario {
  slug: string;
  nombre: string;
  eslogan: string;
  foto: string;
  curso: {
    titulo: string;
    url: string;
    lecciones: number;
    completadas: number;
  };
  funciones: FuncionKit[];
}

export interface Usuario {
  nombre: string;
  email: string;
}

/** Error con el mensaje que da la web (ya en español, listo para enseñar) */
export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public estado: number,
    public datos: Record<string, unknown> = {},
  ) {
    super(mensaje);
  }
}

async function pedir<T>(
  ruta: string,
  opciones: {
    metodo?: "GET" | "POST";
    cuerpo?: unknown;
    token?: string | null;
  } = {},
): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${WEB}/api/app/${ruta}`, {
      method: opciones.metodo ?? "POST",
      headers: {
        "content-type": "application/json",
        ...(opciones.token && { authorization: `Bearer ${opciones.token}` }),
      },
      body:
        opciones.cuerpo === undefined
          ? undefined
          : JSON.stringify(opciones.cuerpo),
    });
  } catch {
    throw new ErrorApi(
      "No hay conexión. Revisa el wifi o los datos del móvil.",
      0,
    );
  }
  const datos = (await respuesta.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!respuesta.ok) {
    const mensaje =
      typeof datos.mensaje === "string"
        ? datos.mensaje
        : "Algo ha fallado. Inténtalo de nuevo.";
    throw new ErrorApi(mensaje, respuesta.status, datos);
  }
  return datos as T;
}

export const api = {
  entrar: (email: string, contrasena: string) =>
    pedir<{ verificacion: string; email: string }>("entrar", {
      cuerpo: { email, contrasena, sistema: SISTEMA },
    }),
  verificar: (verificacion: string, codigo: string) =>
    pedir<{ token: string; usuario: Usuario }>("verificar", {
      cuerpo: { verificacion, codigo, sistema: SISTEMA },
    }),
  reenviar: (verificacion: string) =>
    pedir<{ espera: number }>("reenviar", { cuerpo: { verificacion } }),
  yo: (token: string) =>
    pedir<{ usuario: Usuario; kits: KitUsuario[] }>("yo", {
      metodo: "GET",
      token,
    }),
  activar: (token: string, codigo: string) =>
    pedir<{
      estado: "activado" | "ya-tienes";
      kit: string | null;
      kits: KitUsuario[];
    }>("activar", {
      cuerpo: { codigo },
      token,
    }),
  salir: (token: string) => pedir<{ ok: true }>("salir", { token }),
};
