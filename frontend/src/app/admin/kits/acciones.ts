"use server";

/**
 * ACCIONES DEL PANEL: KITS
 * Cada acción comprueba primero que quien la llama es ADMIN.
 */
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { casilla, conErrores, texto, textos, type EstadoFormulario } from "@/lib/admin/formularios";
import { refrescarTienda } from "@/lib/admin/refrescar";
import { borrarImagen, ErrorImagen, hayArchivo, subirImagen } from "@/lib/almacenamiento";
import { db, transaccion } from "@/lib/db";
import { exigirCatalogoEnAccion } from "@/lib/sesion";
import { crearSlug, esquemaKitAdmin, slug as esquemaSlug } from "@/lib/validaciones/admin";
import { idsValidos } from "@/lib/ids";

/** Crear (sin id) o editar (con id) un kit */
export async function guardarKit(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirCatalogoEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos lo que quieres cambiar." };

  // Las piezas llegan como dos listas: ids y cantidades
  const ids = textos(formulario, "piezaId");
  const cantidades = textos(formulario, "piezaCantidad");
  const foto = formulario.get("foto");
  const faltaFoto: Record<string, string> =
    !id && !hayArchivo(foto) ? { foto: "Sube una foto del kit." } : {};

  const datos = esquemaKitAdmin.safeParse({
    nombre: texto(formulario, "nombre"),
    eslogan: texto(formulario, "eslogan"),
    descripcion: texto(formulario, "descripcion"),
    precio: texto(formulario, "precio"),
    nivel: texto(formulario, "nivel"),
    edadMinima: texto(formulario, "edadMinima"),
    tiempoMontaje: texto(formulario, "tiempoMontaje"),
    orden: texto(formulario, "orden") || "0",
    destacado: casilla(formulario, "destacado"),
    visible: casilla(formulario, "visible"),
    puntosFuertes: textos(formulario, "puntoFuerte").filter((p) => p.trim()),
    cursoId: texto(formulario, "cursoId"),
    componentes: ids.map((pieza, i) => ({ id: pieza, cantidad: cantidades[i] ?? "" })),
  });
  if (!datos.success) return conErrores(datos.error, faltaFoto);
  if (faltaFoto.foto) return { ok: false, mensaje: "Falta la foto.", errores: faltaFoto };
  const d = datos.data;

  // El curso tiene que existir y no ser de otro kit
  const curso = await db.curso.findUnique({
    where: { id: d.cursoId },
    select: { kit: { select: { id: true } } },
  });
  if (!curso)
    return {
      ok: false,
      mensaje: "Ese curso ya no existe.",
      errores: { cursoId: "Elige otro curso." },
    };
  if (curso.kit && curso.kit.id !== id) {
    return {
      ok: false,
      mensaje: "Ese curso ya es de otro kit.",
      errores: { cursoId: "Cada curso va con un solo kit." },
    };
  }

  // Las piezas tienen que existir
  const existentes = await db.componente.count({
    where: { id: { in: d.componentes.map((c) => c.id) } },
  });
  if (existentes !== d.componentes.length) {
    return {
      ok: false,
      mensaje: "Alguna pieza ya no existe. Recarga la página.",
      errores: { componentes: "Revisa las piezas." },
    };
  }

  // El slug (la dirección) solo se elige al crear; después no cambia (lo usan los pedidos y los carritos)
  let slugNuevo: string | undefined;
  if (!id) {
    const slug = esquemaSlug.safeParse(texto(formulario, "slug") || crearSlug(d.nombre));
    if (!slug.success) {
      return {
        ok: false,
        mensaje: "Revisa la dirección.",
        errores: { slug: slug.error.issues[0].message },
      };
    }
    slugNuevo = slug.data;
    if (await db.kit.findUnique({ where: { slug: slugNuevo }, select: { id: true } })) {
      return {
        ok: false,
        mensaje: "Revisa la dirección.",
        errores: { slug: "Ya hay un kit con esta dirección." },
      };
    }
  }

  const anterior = id ? await db.kit.findUnique({ where: { id }, select: { imagen: true } }) : null;
  if (id && !anterior) return { ok: false, mensaje: "Este kit ya no existe." };

  let imagen: string | undefined;
  if (hayArchivo(foto)) {
    try {
      imagen = await subirImagen(foto, "kits");
    } catch (error) {
      if (error instanceof ErrorImagen) {
        return { ok: false, mensaje: error.message, errores: { foto: error.message } };
      }
      throw error;
    }
  }

  const { precio, componentes, cursoId, ...resto } = d;
  const campos = {
    ...resto,
    precioCentimos: precio,
    curso: { connect: { id: cursoId } },
    ...(imagen && { imagen }),
  };

  let idGuardado = id;
  try {
    idGuardado = await transaccion(async (tx) => {
      // Solo puede haber un kit destacado (el de la portada)
      if (d.destacado)
        await tx.kit.updateMany({ where: { destacado: true }, data: { destacado: false } });

      if (id) {
        // Las piezas se sustituyen por la lista nueva
        await tx.kitComponente.deleteMany({ where: { kitId: id } });
        await tx.kit.update({
          where: { id },
          data: {
            ...campos,
            componentes: {
              create: componentes.map((c) => ({ componenteId: c.id, cantidad: c.cantidad })),
            },
          },
        });
        return id;
      }
      const creado = await tx.kit.create({
        data: {
          ...campos,
          slug: slugNuevo!,
          imagen: imagen!,
          componentes: {
            create: componentes.map((c) => ({ componenteId: c.id, cantidad: c.cantidad })),
          },
        },
      });
      return creado.id;
    });
  } catch (error) {
    await borrarImagen(imagen); // si no se ha guardado, la foto nueva sobra
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, mensaje: "La dirección o el curso ya están en uso por otro kit." };
    }
    throw error;
  }

  if (imagen && anterior) await borrarImagen(anterior.imagen);
  refrescarTienda();

  if (!id) redirect(`/admin/kits/${idGuardado}?creado=1`);
  return { ok: true, mensaje: "Cambios guardados. Ya se ven en la tienda y en el configurador." };
}

/** Ocultar o volver a mostrar un kit en la tienda */
export async function cambiarVisibilidadKit(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirCatalogoEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos lo que quieres cambiar." };
  const kit = await db.kit.findUnique({ where: { id }, select: { visible: true } });
  if (!kit) return { ok: false, mensaje: "Este kit ya no existe." };
  await db.kit.update({ where: { id }, data: { visible: !kit.visible } });
  refrescarTienda();
  return { ok: true, mensaje: kit.visible ? "Kit oculto." : "Kit visible." };
}

/**
 * Borrar un kit. No se puede si ya tiene códigos de activación o se ha pedido alguna vez:
 * se perderían los códigos impresos y el historial. En ese caso se ofrece ocultarlo.
 * El curso NO se borra: se queda libre para otro kit.
 */
export async function borrarKit(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  await exigirCatalogoEnAccion();
  const id = texto(formulario, "id");
  if (!idsValidos(id)) return { ok: false, mensaje: "No encontramos lo que quieres cambiar." };
  const kit = await db.kit.findUnique({
    where: { id },
    select: { slug: true, imagen: true, _count: { select: { codigos: true } } },
  });
  if (!kit) return { ok: false, mensaje: "Este kit ya no existe." };

  const pedidos = await db.lineaPedido.count({ where: { tipo: "KIT", slug: kit.slug } });
  if (kit._count.codigos > 0 || pedidos > 0) {
    return {
      ok: false,
      mensaje:
        "No se puede borrar porque ya tiene códigos de activación o pedidos, y se perderían. Si no quieres venderlo más, ocúltalo.",
    };
  }

  await db.kit.delete({ where: { id } });
  await borrarImagen(kit.imagen);
  refrescarTienda();
  redirect("/admin/kits?borrado=1");
}
