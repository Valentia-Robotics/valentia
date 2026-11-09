"use server";

/**
 * ACCIONES DE LOS ESPACIOS DE HARDWARE
 * Las usan /hardware (su dueño) y /admin/hardware (administradores): el permiso lo decide
 * src/lib/hardware/archivos.ts según quién llama, nunca lo que diga el formulario.
 */
import { revalidatePath } from "next/cache";
import { texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { borrarArchivo, ErrorArchivo } from "@/lib/hardware/archivos";
import { obtenerUsuario, SinPermiso } from "@/lib/sesion";

export async function borrarArchivoHardware(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const usuario = await obtenerUsuario();
  if (!usuario || (usuario.rol !== "HARDWARE" && usuario.rol !== "ADMIN")) throw new SinPermiso();
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
