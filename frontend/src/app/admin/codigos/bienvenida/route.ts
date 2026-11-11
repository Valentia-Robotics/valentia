/**
 * TARJETAS DE BIENVENIDA: POST /admin/codigos/bienvenida (campo «cantidad»)
 * Crea un lote nuevo de códigos del kit de bienvenida y devuelve al momento su ZIP para el láser, con el
 * mismo formato que el de los lotes de los kits. Lo usa el botón «Descargar ZIP de bienvenida» del panel.
 */
import { tieneAccesoAdmin } from "@/config/equipo";
import { MAXIMO_TARJETAS_BIENVENIDA, SLUG_KIT_BIENVENIDA } from "@/config/bienvenida";
import { crearLote, obtenerLote } from "@/lib/admin/codigos";
import { db } from "@/lib/db";
import { obtenerUsuario } from "@/lib/sesion";
import { respuestaZip, zipDeLote } from "@/lib/tarjetaLaser/zipLote";

const texto = (mensaje: string, status: number) =>
  new Response(mensaje, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(peticion: Request) {
  // Solo administradores; para los demás, como si no existiera
  const usuario = await obtenerUsuario();
  if (!tieneAccesoAdmin(usuario?.rol)) return texto("No encontrado", 404);

  // Solo desde la propia web (otra página no puede pedir lotes en nombre del administrador)
  const sitio = peticion.headers.get("sec-fetch-site");
  const origen = peticion.headers.get("origin");
  const host = peticion.headers.get("x-forwarded-host") ?? peticion.headers.get("host");
  const mismoSitio =
    sitio === "same-origin" || (origen !== null && host !== null && new URL(origen).host === host);
  if (!mismoSitio) return texto("No permitido", 403);

  const formulario = await peticion.formData().catch(() => null);
  const cantidad = Number(formulario?.get("cantidad"));
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAXIMO_TARJETAS_BIENVENIDA)
    return texto(`Escribe un número entre 1 y ${MAXIMO_TARJETAS_BIENVENIDA}.`, 400);

  const kit = await db.kit.findUnique({
    where: { slug: SLUG_KIT_BIENVENIDA },
    select: { id: true },
  });
  if (!kit)
    return texto(
      "No existe el «Kit de bienvenida» en la tienda. Créalo (o recupéralo) en Kits y vuelve a probar.",
      409,
    );

  const lote = await obtenerLote(await crearLote(kit.id, cantidad));
  if (!lote) return texto("No se pudo crear el lote. Vuelve a probar.", 500);
  return respuestaZip(zipDeLote(lote));
}
