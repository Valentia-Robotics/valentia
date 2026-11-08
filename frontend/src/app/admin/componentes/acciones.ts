"use server";

/**
 * ACCIONES DEL PANEL: COMPONENTES
 * Cada acción comprueba primero que quien la llama es ADMIN.
 */
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { conErrores, casilla, texto, textos, type EstadoFormulario } from "@/lib/admin/formularios";
import { refrescarTienda } from "@/lib/admin/refrescar";
import { borrarImagen, ErrorImagen, hayArchivo, subirImagen } from "@/lib/almacenamiento";
import { db } from "@/lib/db";
import { exigirAdminEnAccion } from "@/lib/sesion";
import { crearSlug, esquemaComponenteAdmin, slug as esquemaSlug } from "@/lib/validaciones/admin";
import { idsValidos } from "@/lib/ids";

/** Crear (sin id) o editar (con id) un componente */
export async function guardarComponente(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos lo que quieres cambiar." };

  // Los datos técnicos llegan como dos listas (nombres y valores); quitamos las filas vacías
  const nombres = textos(formulario, "espNombre");
  const valores = textos(formulario, "espValor");
  const especificaciones = nombres
    .map((nombre, i) => ({ nombre, valor: valores[i] ?? "" }))
    .filter((e) => e.nombre.trim() || e.valor.trim());

  const datos = esquemaComponenteAdmin.safeParse({
    nombre: texto(formulario, "nombre"),
    categoria: texto(formulario, "categoria"),
    tipo: texto(formulario, "tipo"),
    resumen: texto(formulario, "resumen"),
    descripcion: texto(formulario, "descripcion"),
    precio: texto(formulario, "precio"),
    stock: texto(formulario, "stock"),
    voltaje: texto(formulario, "voltaje"),
    voltajeLogico: texto(formulario, "voltajeLogico"),
    voltajeLogicoMin: texto(formulario, "voltajeLogicoMin"),
    consumoMa: texto(formulario, "consumoMa"),
    conector: texto(formulario, "conector"),
    pines: texto(formulario, "pines"),
    especificaciones,
    visible: casilla(formulario, "visible"),
  });
  // Foto: obligatoria al crear; al editar, solo si quieres cambiarla
  const foto = formulario.get("foto");
  const faltaFoto: Record<string, string> =
    !id && !hayArchivo(foto) ? { foto: "Sube una foto del componente." } : {};
  if (!datos.success) return conErrores(datos.error, faltaFoto);
  if (faltaFoto.foto) return { ok: false, mensaje: "Falta la foto.", errores: faltaFoto };

  // El slug (la dirección) solo se elige al crear; después no cambia
  let slugNuevo: string | undefined;
  if (!id) {
    const slug = esquemaSlug.safeParse(texto(formulario, "slug") || crearSlug(datos.data.nombre));
    if (!slug.success)
      return {
        ok: false,
        mensaje: "Revisa la dirección.",
        errores: { slug: slug.error.issues[0].message },
      };
    slugNuevo = slug.data;
    if (await db.componente.findUnique({ where: { slug: slugNuevo }, select: { id: true } })) {
      return {
        ok: false,
        mensaje: "Revisa la dirección.",
        errores: { slug: "Ya hay un componente con esta dirección." },
      };
    }
  }

  const anterior = id
    ? await db.componente.findUnique({ where: { id }, select: { imagen: true } })
    : null;
  if (id && !anterior) return { ok: false, mensaje: "Este componente ya no existe." };

  let imagen: string | undefined;
  if (hayArchivo(foto)) {
    try {
      imagen = await subirImagen(foto, "componentes");
    } catch (error) {
      if (error instanceof ErrorImagen)
        return { ok: false, mensaje: error.message, errores: { foto: error.message } };
      throw error;
    }
  }

  const { precio, ...resto } = datos.data;
  const campos = { ...resto, precioCentimos: precio, ...(imagen && { imagen }) };

  let idGuardado = id;
  try {
    if (id) {
      await db.componente.update({ where: { id }, data: campos });
    } else {
      const creado = await db.componente.create({
        data: { ...campos, slug: slugNuevo!, imagen: imagen! },
      });
      idGuardado = creado.id;
    }
  } catch (error) {
    await borrarImagen(imagen); // si no se ha guardado, la foto nueva sobra
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        mensaje: "Ya hay un componente con esta dirección.",
        errores: { slug: "Ya existe." },
      };
    }
    throw error;
  }

  // La foto antigua ya no se usa
  if (imagen && anterior) await borrarImagen(anterior.imagen);
  refrescarTienda();

  if (!id) redirect(`/admin/componentes/${idGuardado}?creado=1`);
  return { ok: true, mensaje: "Cambios guardados. Ya se ven en la tienda y en el configurador." };
}

/** Ocultar o volver a mostrar un componente en la tienda y el configurador */
export async function cambiarVisibilidadComponente(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos lo que quieres cambiar." };
  const componente = await db.componente.findUnique({ where: { id }, select: { visible: true } });
  if (!componente) return { ok: false, mensaje: "Este componente ya no existe." };
  await db.componente.update({ where: { id }, data: { visible: !componente.visible } });
  refrescarTienda();
  return { ok: true, mensaje: componente.visible ? "Componente oculto." : "Componente visible." };
}

/**
 * Borrar un componente. No se puede si está dentro de algún kit
 * (se perdería una pieza de la caja): en ese caso se ofrece ocultarlo.
 * Los pedidos antiguos no se ven afectados: guardan su propia copia del nombre y el precio.
 */
export async function borrarComponente(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirAdminEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos lo que quieres cambiar." };
  const componente = await db.componente.findUnique({
    where: { id },
    select: { imagen: true, enKits: { select: { kit: { select: { nombre: true } } } } },
  });
  if (!componente) return { ok: false, mensaje: "Este componente ya no existe." };
  if (componente.enKits.length > 0) {
    const kits = componente.enKits.map((k) => k.kit.nombre).join(", ");
    return {
      ok: false,
      mensaje: `No se puede borrar porque está en estos kits: ${kits}. Quítalo de esos kits o, si solo quieres que no se venda suelto, ocúltalo.`,
    };
  }

  await db.componente.delete({ where: { id } });
  await borrarImagen(componente.imagen);
  refrescarTienda();
  redirect("/admin/componentes?borrado=1");
}
