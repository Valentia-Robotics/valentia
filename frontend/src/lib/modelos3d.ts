import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";
import { CARPETA_MODELOS, modelosDeArchivos, type Modelo3D } from "@/config/modelos3d";

/**
 * Busca los modelos 3D que hay en public/modelos/componentes (ver src/config/modelos3d.ts).
 * La carpeta se lee una vez por arranque del servidor: los archivos llegan con cada publicación.
 */
let modelos: Map<string, Modelo3D> | null = null;

function leerCarpeta(): Map<string, Modelo3D> {
  for (const base of [
    path.join(/* turbopackIgnore: true */ process.cwd(), "public"),
    path.join(/* turbopackIgnore: true */ process.cwd(), "frontend", "public"),
  ]) {
    try {
      return modelosDeArchivos(readdirSync(path.join(base, CARPETA_MODELOS)));
    } catch {
      // Esa carpeta no existe aquí: probar la siguiente
    }
  }
  return new Map();
}

/** El modelo 3D de un componente, o null si todavía no tiene (entonces se ve su foto) */
export function modeloDeComponente(slug: string): Modelo3D | null {
  // En desarrollo se vuelve a leer siempre: así un archivo nuevo sale sin reiniciar `npm run dev`
  if (!modelos || process.env.NODE_ENV === "development") modelos = leerCarpeta();
  return modelos.get(slug) ?? null;
}
