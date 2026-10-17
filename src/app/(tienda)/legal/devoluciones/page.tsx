// ⚠ BORRADOR — pendiente de revisión por un profesional.
import type { Metadata } from "next";
import { DatosEmpresa, PaginaLegal } from "@/components/legal/PaginaLegal";
import { tienda } from "@/config/tienda";

export const metadata: Metadata = {
  title: "Devoluciones y desistimiento",
  description: `Cómo devolver un pedido de Valentia: tienes ${tienda.diasDesistimiento} días.`,
};

const e = tienda.empresa;
const dias = tienda.diasDesistimiento;

/** POLÍTICA DE DEVOLUCIONES Y DERECHO DE DESISTIMIENTO (arts. 102 a 108 del TRLGDCU) */
export default function Devoluciones() {
  return (
    <PaginaLegal titulo="Devoluciones y desistimiento" actualizado="17 de octubre de 2026">
      <p>
        ¿Has cambiado de idea? No pasa nada. Tienes <strong>{dias} días naturales</strong> para
        devolver tu pedido sin tener que darnos ninguna explicación.
      </p>

      <h2>1. Plazo</h2>
      <p>
        El plazo de {dias} días empieza el día en que tú (o la persona que indiques) recibís el
        pedido. Si el pedido llega en varios paquetes, cuenta desde la entrega del último.
      </p>

      <h2>2. Cómo devolverlo</h2>
      <ol>
        <li>
          Escríbenos a {e.email} indicando tu número de pedido y que quieres desistir. Puedes usar
          el formulario de abajo, aunque no es obligatorio.
        </li>
        <li>Te contestaremos con la dirección y las instrucciones para el envío.</li>
        <li>
          Envíanos los productos en un plazo de {dias} días desde que nos lo comunicas, bien
          protegidos y, si puede ser, en su caja original.
        </li>
      </ol>
      <DatosEmpresa datos={[["Dirección para devoluciones", e.direccion]]} />

      <h2>3. Reembolso</h2>
      <p>
        Te devolveremos todo lo que pagaste, incluidos los gastos de envío ordinarios, en un plazo
        máximo de {dias} días desde que nos comunicas el desistimiento, con el mismo medio de pago.
        Podemos esperar a recibir los productos (o a que nos envíes el justificante de envío) antes
        de hacer el reembolso. Los gastos de devolver el paquete corren de tu cuenta. [REVISAR:
        decidir si Valentia asume el coste de la devolución.]
      </p>

      <h2>4. Estado de los productos</h2>
      <p>
        Puedes abrir la caja y comprobar los componentes como lo harías en una tienda. Si los
        productos vuelven dañados o con un uso mayor del necesario para comprobarlos, podremos
        descontar la pérdida de valor.
      </p>

      <h2>5. Kits con curso</h2>
      <p>
        Al devolver un kit, desactivamos su código de activación si todavía no se ha usado. Si ya
        habías activado el curso, [REVISAR CON UN ABOGADO: tratamiento del contenido digital ya
        activado (art. 103.m TRLGDCU), consentimiento expreso necesario y si se retira el acceso].
      </p>

      <h2>6. Productos defectuosos</h2>
      <p>
        Esto es distinto del desistimiento: si un producto llega roto o falla, tienes la garantía
        legal de 3 años. Escríbenos a {e.email} con una foto o una breve explicación y lo
        solucionaremos sin coste para ti.
      </p>

      <h2>7. Formulario de desistimiento</h2>
      <p>(Solo tienes que rellenarlo y enviarlo si quieres desistir del contrato.)</p>
      <div className="mt-4 rounded-tarjeta bg-niebla p-5 text-sm">
        <p className="mt-0!">
          A la atención de {e.razonSocial}, {e.direccion}, {e.email}:
        </p>
        <p>
          Por la presente le comunico que desisto de mi contrato de venta de los siguientes bienes:
          ________________________________
        </p>
        <p>Pedido n.º ____________ · Pedido el ____/____/______ · Recibido el ____/____/______</p>
        <p>Nombre: ______________________________________</p>
        <p>Dirección: ____________________________________</p>
        <p>Firma (solo si se envía en papel) y fecha: ____________________</p>
      </div>
    </PaginaLegal>
  );
}
