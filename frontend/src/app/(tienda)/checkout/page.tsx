import type { Metadata } from "next";
import { FormularioCheckout } from "@/components/compra/FormularioCheckout";
import { Contenedor } from "@/components/ui/Contenedor";
import { db } from "@/lib/db";
import { modoPago } from "@/lib/pagos";
import { obtenerUsuario } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false },
};

/**
 * CHECKOUT: datos de envío y pago. Se puede comprar con cuenta (usa sus direcciones
 * guardadas) o como invitado (con el email). La lógica está en acciones.ts.
 */
export default async function PaginaCheckout() {
  const usuario = await obtenerUsuario();
  const direcciones = usuario
    ? await db.direccion.findMany({
        where: { usuarioId: usuario.id },
        orderBy: [{ predeterminada: "desc" }, { creadoEn: "desc" }],
        select: {
          id: true,
          nombre: true,
          telefono: true,
          direccion: true,
          codigoPostal: true,
          ciudad: true,
          provincia: true,
        },
      })
    : [];

  let modo;
  try {
    modo = modoPago();
  } catch {
    modo = "desactivado" as const; // claves mal configuradas: se explica en la terminal
  }

  return (
    <Contenedor className="py-12 sm:py-16">
      <h1 className="text-4xl font-medium sm:text-5xl">Finalizar compra.</h1>
      <FormularioCheckout
        cuenta={usuario ? { nombre: usuario.nombre, email: usuario.email } : null}
        direcciones={direcciones}
        modo={modo}
      />
    </Contenedor>
  );
}
