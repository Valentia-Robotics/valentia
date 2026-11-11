"use server";

/**
 * ACCIONES DE LOS ESPACIOS DE HARDWARE
 * Las usan /hardware (su dueño) y /admin/hardware (administradores): el permiso lo decide
 * src/lib/hardware/archivos.ts según quién llama, nunca lo que diga el formulario.
 */
import { tieneAccesoAdmin } from "@/config/equipo";
import { revalidatePath } from "next/cache";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { borrarArchivo, borrarCarpeta, crearCarpetas, ErrorArchivo } from "@/lib/hardware/archivos";
import { obtenerUsuario, SinPermiso, type UsuarioActual } from "@/lib/sesion";

/** Quién llama (solo hardware o admin) y de quién es el espacio: alguien de hardware, el suyo */
async function quienYDonde(formulario: FormData): Promise<[UsuarioActual, string]> {
  const usuario = await obtenerUsuario();
  if (!usuario || (usuario.rol !== "HARDWARE" && !tieneAccesoAdmin(usuario.rol))) throw new SinPermiso();
  return [usuario, usuario.rol === "HARDWARE" ? usuario.id : texto(formulario, "duenoId")];
}

function refrescar() {
  revalidatePath("/hardware");
  revalidatePath("/admin/hardware", "layout");
}

/** «Nueva carpeta»: `dentro` es la carpeta abierta y `nombre` lo que se ha escrito (admite «a/b») */
export async function crearCarpetaHardware(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const [usuario, duenoId] = await quienYDonde(formulario);
  const nombre = texto(formulario, "nombre");
  if (!nombre.trim()) return { ok: false, mensaje: "Escribe el nombre de la carpeta." };
  const dentro = texto(formulario, "dentro");
  try {
    await crearCarpetas(usuario, duenoId, [dentro ? `${dentro}/${nombre}` : nombre]);
  } catch (error) {
    if (error instanceof ErrorArchivo) return { ok: false, mensaje: error.message };
    throw error;
  }
  refrescar();
  return { ok: true };
}

/** Al subir una carpeta: guarda sus subcarpetas vacías (`rutas`) para que se vean */
export async function crearCarpetasVaciasHardware(
  duenoId: string,
  rutas: string[],
): Promise<{ error: string | null }> {
  const formulario = new FormData();
  formulario.set("duenoId", String(duenoId));
  const [usuario, dueno] = await quienYDonde(formulario);
  if (!Array.isArray(rutas)) return { error: "No se han podido crear las carpetas." };
  try {
    await crearCarpetas(usuario, dueno, rutas.map(String));
  } catch (error) {
    if (error instanceof ErrorArchivo) return { error: error.message };
    throw error;
  }
  refrescar();
  return { error: null };
}

/** Borra una carpeta con todo lo que lleva dentro (archivos y subcarpetas) */
export async function borrarCarpetaHardware(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const [usuario, duenoId] = await quienYDonde(formulario);
  try {
    await borrarCarpeta(usuario, duenoId, texto(formulario, "ruta"));
  } catch (error) {
    if (error instanceof ErrorArchivo) return { ok: false, mensaje: error.message };
    throw error;
  }
  refrescar();
  return { ok: true };
}

export async function borrarArchivoHardware(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const usuario = await obtenerUsuario();
  if (!usuario || (usuario.rol !== "HARDWARE" && !tieneAccesoAdmin(usuario.rol))) throw new SinPermiso();
  try {
    await borrarArchivo(usuario, texto(formulario, "archivoId"));
  } catch (error) {
    if (error instanceof ErrorArchivo) return { ok: false, mensaje: error.message };
    throw error;
  }
  revalidatePath("/hardware");
  revalidatePath("/admin/hardware", "layout");
  return { ok: true };
}
