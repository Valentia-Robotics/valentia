"use server";

/**
 * ACCIONES DE /stock. Solo un ADMIN cambia el stock: editores y hardware lo ven, pero aquí
 * se comprueba otra vez (una acción se puede llamar desde fuera de la web).
 */
import { revalidatePath } from "next/cache";
import { MAXIMO_AVISO, MAXIMO_UNIDADES, leerEntero } from "@/config/stock";
import { refrescarTienda } from "@/lib/admin/refrescar";
import { casilla, texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { esId } from "@/lib/ids";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { cambiarStock } from "@/lib/stock/stock";

export async function guardarStock(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirAdminEnAccion();
  const tipo = texto(formulario, "tipo");
  const productoId = texto(formulario, "productoId");
  if ((tipo !== "kit" && tipo !== "componente") || !esId(productoId)) {
    return { ok: false, mensaje: "No encontramos este producto." };
  }

  const unidades = leerEntero(texto(formulario, "unidades"), MAXIMO_UNIDADES);
  const avisoTexto = texto(formulario, "minimo").trim();
  // Vacío = el aviso de siempre
  const minimo = avisoTexto === "" ? null : leerEntero(avisoTexto, MAXIMO_AVISO);
  const errores: Record<string, string> = {};
  if (unidades === null) errores.unidades = "Escribe un número entero, 0 o más.";
  if (avisoTexto !== "" && minimo === null)
    errores.minimo = "Escribe un número entero o déjalo vacío.";
  if (unidades === null || Object.keys(errores).length > 0) {
    return { ok: false, mensaje: "Revisa los números.", errores };
  }

  const hecho = await cambiarStock({
    tipo,
    id: productoId,
    unidades,
    minimo,
    enReposicion: casilla(formulario, "enReposicion"),
    autorNombre: admin.nombre,
  });
  if (!hecho) return { ok: false, mensaje: "Este producto ya no existe." };

  revalidatePath("/stock");
  // La tienda enseña «En stock», «En reposición» o «Sin stock»
  refrescarTienda();
  return { ok: true, mensaje: "Guardado." };
}
