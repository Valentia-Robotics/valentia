import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";
import {
  AJUSTES_MODELOS,
  CARPETA_MODELOS,
  CARPETA_MODELOS_KITS,
  modelosDeArchivos,
  type Modelo3D,
} from "@/config/modelos3d";

/**
 * Busca los modelos 3D que hay en public/modelos/componentes y public/modelos/kits
 * (ver src/config/modelos3d.ts). Cada carpeta se lee una vez por arranque del servidor: los archivos
 * llegan con cada publicación.
 */
const leidas = new Map<string, Map<string, Modelo3D>>();

function leerCarpeta(carpeta: string): Map<string, Modelo3D> {
  for (const base of [
    path.join(/* turbopackIgnore: true */ process.cwd(), "public"),
    path.join(/* turbopackIgnore: true */ process.cwd(), "frontend", "public"),
  ]) {
    try {
      return modelosDeArchivos(readdirSync(path.join(base, carpeta)), AJUSTES_MODELOS, carpeta);
    } catch {
      // Esa carpeta no existe aquí: probar la siguiente
    }
  }
  return new Map();
}

function modeloDe(carpeta: string, slug: string): Modelo3D | null {
  // En desarrollo se vuelve a leer siempre: así un archivo nuevo sale sin reiniciar `npm run dev`
  let modelos = leidas.get(carpeta);
  if (!modelos || process.env.NODE_ENV === "development") {
    modelos = leerCarpeta(carpeta);
    leidas.set(carpeta, modelos);
  }
  return modelos.get(slug) ?? null;
}

/** El modelo 3D de un componente, o null si todavía no tiene (entonces se ve su foto) */
export function modeloDeComponente(slug: string): Modelo3D | null {
  return modeloDe(CARPETA_MODELOS, slug);
}

/** El modelo 3D de un kit montado, o null si no tiene (entonces se ve su foto) */
export function modeloDeKit(slug: string): Modelo3D | null {
  return modeloDe(CARPETA_MODELOS_KITS, slug);
}
