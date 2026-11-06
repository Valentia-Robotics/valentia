"use server";

/**
 * ACCIONES DE LA FICHA DE KIT: conseguir un kit gratis y las reseñas
 * Las reseñas comprueban la sesión y, con las reglas de src/config/resenas.ts, si la persona puede opinar.
 */
import { redirect } from "next/navigation";
import { activarKitGratis } from "@/lib/activacion";
import { conErrores, texto, type EstadoFormulario } from "@/lib/admin/formularios";
import { refrescarTienda } from "@/lib/admin/refrescar";
import { configResenas } from "@/config/resenas";
import { db } from "@/lib/db";
import { puedeOpinar } from "@/lib/resenas";
import { esquemaResena } from "@/lib/resenas/formato";
import { obtenerUsuario } from "@/lib/sesion";

export interface MiResena {
  /** ¿Ha iniciado sesión? */
  conSesion: boolean;
  /** ¿Puede escribir una reseña de este kit? */
  puede: boolean;
  /** Su reseña, si ya escribió una */
  resena: { estrellas: number; texto: string; estado: "PENDIENTE" | "PUBLICADA" | "OCULTA" } | null;
}

/**
 * «Conseguir gratis»: sin sesión, manda a iniciarla y vuelve a la ficha; con sesión, da el curso y lleva a él.
 * Es la «compra» de un kit de 0 €: no crea pedido ni pasa por ningún pago.
 */
export async function conseguirKitGratis(slug: string) {
  if (typeof slug !== "string" || slug.length > 200) redirect("/kits");
  const ficha = `/kits/${slug}`;
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(`/login?callbackUrl=${encodeURIComponent(ficha)}`);

  const kit = await activarKitGratis(usuario.id, slug);
  redirect(kit ? `/cursos/${kit.cursoSlug}` : ficha);
}

async function kitVisible(slug: string) {
  if (typeof slug !== "string" || slug.length > 200) return null;
  return db.kit.findFirst({ where: { slug, visible: true }, select: { id: true } });
}

/** Lo que necesita el formulario: si hay sesión, si puede opinar y su reseña anterior */
export async function leerMiResena(slug: string): Promise<MiResena> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { conSesion: false, puede: false, resena: null };
  const kit = await kitVisible(slug);
  if (!kit) return { conSesion: true, puede: false, resena: null };

  const [puede, resena] = await Promise.all([
    puedeOpinar(usuario.id, kit.id),
    db.resena.findUnique({
      where: { usuarioId_kitId: { usuarioId: usuario.id, kitId: kit.id } },
      select: { estrellas: true, texto: true, estado: true },
    }),
  ]);
  return { conSesion: true, puede, resena };
}

/** Escribir (o cambiar) la reseña del kit. Una por persona y kit. */
export async function guardarResena(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, mensaje: "Inicia sesión para dejar tu opinión." };

  const kit = await kitVisible(texto(formulario, "slug"));
  if (!kit) return { ok: false, mensaje: "Este kit ya no está a la venta." };
  if (!(await puedeOpinar(usuario.id, kit.id))) {
    return {
      ok: false,
      mensaje:
        "Solo pueden opinar quienes han activado el curso de este kit con el código de la caja.",
    };
  }

  const datos = esquemaResena.safeParse({
    estrellas: texto(formulario, "estrellas"),
    texto: texto(formulario, "texto"),
  });
  if (!datos.success) return conErrores(datos.error);

  const anterior = await db.resena.findUnique({
    where: { usuarioId_kitId: { usuarioId: usuario.id, kitId: kit.id } },
    select: { estado: true },
  });
  // Una reseña ocultada desde el panel sigue oculta aunque se cambie
  const estado =
    anterior?.estado === "OCULTA"
      ? "OCULTA"
      : configResenas.revisarAntesDePublicar
        ? "PENDIENTE"
        : "PUBLICADA";

  await db.resena.upsert({
    where: { usuarioId_kitId: { usuarioId: usuario.id, kitId: kit.id } },
    create: { usuarioId: usuario.id, kitId: kit.id, ...datos.data, estado },
    update: { ...datos.data, estado, actualizadoEn: new Date() },
  });
  refrescarTienda();

  return {
    ok: true,
    mensaje:
      estado === "PUBLICADA"
        ? "¡Gracias! Tu opinión ya se ve en la página (puede tardar unos segundos)."
        : "¡Gracias! Hemos guardado tu opinión.",
  };
}
