// ⚠ BORRADOR — pendiente de revisión por un profesional.
import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import Link from "next/link";
import { DatosEmpresa, PaginaLegal } from "@/components/legal/PaginaLegal";
import { tienda } from "@/config/tienda";
import { formatearPrecio } from "@/lib/utils";

export const metadata: Metadata = metadatosPagina({
  titulo: "Condiciones de venta",
  descripcion: "Condiciones de compra de los kits, componentes y cursos de Valentia.",
  ruta: "/legal/condiciones",
});

const e = tienda.empresa;
const envio = tienda.envio;

/**
 * CONDICIONES GENERALES DE VENTA (Real Decreto Legislativo 1/2007, texto refundido de la Ley
 * General para la Defensa de los Consumidores y Usuarios —TRLGDCU—, y LSSI-CE)
 */
export default function CondicionesVenta() {
  return (
    <PaginaLegal titulo="Condiciones de venta" actualizado="17 de octubre de 2026">
      <h2>1. Vendedor</h2>
      <DatosEmpresa
        datos={[
          ["Vendedor", e.razonSocial],
          ["NIF", e.nif],
          ["Domicilio", e.direccion],
          ["Atención al cliente", `${e.email} · ${e.telefono}`],
        ]}
      />

      <h2>2. Productos</h2>
      <p>
        Vendemos kits de robótica cerrados (que incluyen un curso en línea), componentes sueltos y
        robots personalizados montados con el configurador. Un robot personalizado no incluye curso
        ni código de activación, aunque se haya creado a partir de un kit. Las imágenes son
        orientativas.
      </p>

      <h2>3. Precios</h2>
      <p>
        Los precios están en euros e incluyen el IVA ({tienda.ivaPorcentaje} %). Los gastos de envío
        son de {formatearPrecio(envio.costeCentimos)} y el envío es gratis en pedidos de{" "}
        {formatearPrecio(envio.gratisDesdeCentimos)} o más. Verás el importe final, con el IVA
        desglosado, antes de pagar.
      </p>

      <h2>4. Zona y plazo de entrega</h2>
      <p>
        De momento solo enviamos a la {envio.nombreZona} (provincias de{" "}
        {envio.provincias.map((p) => p.nombre).join(", ")}). El plazo habitual es de {envio.plazo}{" "}
        desde la confirmación del pago, y como máximo de 30 días naturales. Te avisaremos por email
        cuando el pedido salga, con su número de seguimiento.
      </p>

      <h2>5. Cómo se hace un pedido</h2>
      <ol>
        <li>Añade los productos al carrito y pulsa «Tramitar pedido».</li>
        <li>Escribe los datos de envío (con cuenta o como invitado) y acepta estas condiciones.</li>
        <li>Paga con tarjeta en el formulario seguro de Stripe.</li>
        <li>
          Recibirás un email con la confirmación y el resumen del pedido, que sirve de justificante.
        </li>
      </ol>
      <p>
        El contrato se celebra en español. Guardamos una copia del pedido, que puedes consultar en
        «Mi cuenta» o con el enlace del email de confirmación.
      </p>

      <h2>6. Pago</h2>
      <p>
        El pago se hace con tarjeta a través de Stripe, que cumple la norma de seguridad PCI-DSS.
        Los datos de la tarjeta van directamente a Stripe y no los vemos ni los guardamos. El pedido
        se confirma cuando Stripe nos comunica que el pago se ha completado.
      </p>

      <h2>7. Cursos y códigos de activación</h2>
      <p>
        Cada kit incluye una tarjeta con un código QR que da acceso, con una cuenta en la web, a su
        curso en línea. Cada código solo se puede activar una vez. El acceso al curso se mantiene
        mientras la web esté en funcionamiento. [REVISAR: duración del acceso y condiciones de uso
        del contenido digital.]
      </p>

      <h2>8. Derecho de desistimiento y devoluciones</h2>
      <p>
        Tienes {tienda.diasDesistimiento} días naturales para devolver tu pedido sin dar
        explicaciones. Todos los detalles están en la{" "}
        <Link href="/legal/devoluciones">política de devoluciones</Link>.
      </p>

      <h2>9. Garantía</h2>
      <p>
        Los productos tienen la garantía legal de 3 años desde la entrega (arts. 114 y siguientes
        del TRLGDCU). Si algo llega defectuoso o deja de funcionar, escríbenos a {e.email} y lo
        repararemos, sustituiremos o te devolveremos el dinero según corresponda.
      </p>

      <h2>10. Reclamaciones</h2>
      <p>
        Puedes escribirnos a {e.email} o pedir la hoja de reclamaciones. También puedes acudir a los
        servicios de consumo de tu comunidad autónoma o al Sistema Arbitral de Consumo. [REVISAR:
        adhesión, en su caso, a un sistema de arbitraje.]
      </p>

      <h2>11. Ley aplicable</h2>
      <p>
        Estas condiciones se rigen por la ley española. Si eres consumidor, son competentes los
        juzgados de tu domicilio.
      </p>
    </PaginaLegal>
  );
}
