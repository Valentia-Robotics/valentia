/**
 * LEER Y COMPROBAR EL FORMULARIO DE UN GUION (lo usan administración y las ideas de los editores).
 * Valida los campos y que la categoría y el kit existan. Devuelve los datos o el estado de error que
 * se enseña en el formulario.
 */
import "server-only";
import { conErrores, texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { db } from "@/lib/db";
import { esquemaGuion, type DatosGuion } from "@/lib/validaciones/guion";

const revisa = (campo: string, mensaje: string): EstadoFormulario => ({
  ok: false,
  mensaje: "Revisa los campos marcados en rojo.",
  errores: { [campo]: mensaje },
});

/**
 * @param categoriaActual la categoría que ya tenía el guion (una categoría desactivada solo vale si
 *   el guion ya la tenía); undefined al crear
 */
export async function leerFormularioGuion(
  formulario: FormData,
  categoriaActual?: string,
): Promise<{ datos: DatosGuion } | { error: EstadoFormulario }> {
  const datos = esquemaGuion.safeParse({
    titulo: texto(formulario, "titulo"),
    categoriaId: texto(formulario, "categoriaId"),
    plataforma: texto(formulario, "plataforma"),
    plataformaOtra: texto(formulario, "plataformaOtra"),
    duracionObjetivo: texto(formulario, "duracionObjetivo"),
    gancho: texto(formulario, "gancho"),
    desarrollo: texto(formulario, "desarrollo"),
    llamadaAccion: texto(formulario, "llamadaAccion"),
    notasVisuales: texto(formulario, "notasVisuales"),
    kitId: texto(formulario, "kitId"),
    fechaLimite: texto(formulario, "fechaLimite"),
  });
  if (!datos.success) return { error: conErrores(datos.error) };
  const d = datos.data;

  const [categoria, kit] = await Promise.all([
    db.categoriaGuion.findUnique({ where: { id: d.categoriaId }, select: { activa: true } }),
    d.kitId ? db.kit.findUnique({ where: { id: d.kitId }, select: { id: true } }) : true,
  ]);
  if (!categoria || (!categoria.activa && categoriaActual !== d.categoriaId)) {
    return { error: revisa("categoriaId", "Elige una categoría de la lista.") };
  }
  if (!kit) return { error: revisa("kitId", "Ese kit ya no existe.") };
  return { datos: d };
}
