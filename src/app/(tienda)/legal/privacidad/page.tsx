// ⚠ BORRADOR — pendiente de revisión por un profesional.
import type { Metadata } from "next";
import Link from "next/link";
import { DatosEmpresa, PaginaLegal, TablaLegal } from "@/components/legal/PaginaLegal";
import { tienda } from "@/config/tienda";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo tratamos tus datos personales en Valentia (RGPD y LOPDGDD).",
};

const e = tienda.empresa;

/** POLÍTICA DE PRIVACIDAD (Reglamento UE 2016/679 —RGPD— y Ley Orgánica 3/2018 —LOPDGDD—) */
export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="17 de octubre de 2026">
      <p>
        En {e.nombreComercial} nos tomamos en serio tu privacidad. Aquí te explicamos, de forma
        clara, qué datos tratamos, para qué y qué derechos tienes.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <DatosEmpresa
        datos={[
          ["Responsable", e.razonSocial],
          ["NIF", e.nif],
          ["Dirección", e.direccion],
          ["Contacto para privacidad", e.email],
        ]}
      />

      <h2>2. Qué datos tratamos y para qué</h2>
      <TablaLegal titulo="Datos que tratamos y para qué">
        <thead>
          <tr>
            <th>Finalidad</th>
            <th>Datos</th>
            <th>Base legal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Crear y gestionar tu cuenta, verificar tu email y proteger el acceso (códigos y
              dispositivos de confianza)
            </td>
            <td>Nombre, email, contraseña cifrada, dispositivos de confianza</td>
            <td>
              Ejecución del contrato (art. 6.1.b RGPD) e interés legítimo en la seguridad (art.
              6.1.f)
            </td>
          </tr>
          <tr>
            <td>Tramitar, cobrar y enviar tus pedidos; atender devoluciones y garantías</td>
            <td>
              Nombre, email, teléfono, dirección de envío, productos e importes. Los datos de la
              tarjeta los trata directamente Stripe: nunca llegan a nosotros
            </td>
            <td>Ejecución del contrato (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Facturación y obligaciones contables y fiscales</td>
            <td>Datos del pedido</td>
            <td>Obligación legal (art. 6.1.c)</td>
          </tr>
          <tr>
            <td>Darte acceso a los cursos y guardar tu progreso (vídeos vistos, tests, retos)</td>
            <td>Cursos activados, progreso y resultados</td>
            <td>Ejecución del contrato (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Enviarte correos sobre tu cuenta y tus pedidos (códigos, confirmación, envío)</td>
            <td>Nombre y email</td>
            <td>Ejecución del contrato (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>
              Avisarte por email cuando abramos la tienda, si te apuntas a la lista de espera (un
              solo correo; después borramos la lista)
            </td>
            <td>Email y el kit que estabas mirando</td>
            <td>Tu consentimiento (art. 6.1.a), que puedes retirar escribiéndonos</td>
          </tr>
          <tr>
            <td>Cargar vídeos de YouTube o Vimeo en los cursos</td>
            <td>Datos técnicos del navegador que recogen esos servicios</td>
            <td>Tu consentimiento (art. 6.1.a), que puedes retirar en «Configurar cookies»</td>
          </tr>
        </tbody>
      </TablaLegal>
      <p>No enviamos publicidad ni elaboramos perfiles comerciales. No vendemos tus datos.</p>

      <h2>3. Menores de edad</h2>
      <p>
        Nuestros kits están pensados también para jóvenes, pero las cuentas y las compras deben
        hacerlas personas mayores de 14 años (art. 7 LOPDGDD). Si quien va a usar el curso es menor
        de 14 años, debe crear la cuenta su madre, padre o tutor.
      </p>

      <h2>4. Cuánto tiempo guardamos los datos</h2>
      <ul>
        <li>Cuenta y progreso de los cursos: mientras la cuenta esté activa.</li>
        <li>
          Pedidos y facturas: el tiempo que exige la normativa fiscal y mercantil (en general, 6
          años).
        </li>
        <li>
          Códigos de verificación: unos minutos; registros de seguridad: el mínimo imprescindible.
        </li>
      </ul>

      <h2>5. Con quién compartimos datos</h2>
      <p>
        Solo con proveedores que necesitamos para darte el servicio, con contrato de encargo de
        tratamiento:
      </p>
      <ul>
        <li>Stripe (pagos con tarjeta).</li>
        <li>El proveedor de envío de correos electrónicos.</li>
        <li>El proveedor de alojamiento de la web, de la base de datos y de las imágenes.</li>
        <li>La empresa de transporte que entrega tu pedido (nombre, dirección y teléfono).</li>
        <li>YouTube (Google) y Vimeo, solo si aceptas sus cookies para ver los vídeos.</li>
      </ul>
      <p>
        Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo. En ese
        caso lo hacen con las garantías del RGPD (decisión de adecuación, como el Marco de
        Privacidad de Datos UE-EE. UU., o cláusulas contractuales tipo). [COMPLETAR CON LA LISTA
        DEFINITIVA DE PROVEEDORES Y SUS GARANTÍAS]
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes pedir el acceso, la rectificación, la supresión, la limitación, la portabilidad de
        tus datos u oponerte a su tratamiento escribiendo a {e.email}. Si te parece que no hemos
        atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos
        (aepd.es).
      </p>
      <p>
        Desde «Mi cuenta» ya puedes ver tus pedidos y dispositivos y borrar tus direcciones
        guardadas.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Las contraseñas se guardan cifradas, los códigos de verificación solo como huella, la web
        funciona siempre con conexión cifrada (HTTPS) y los datos de pago los gestiona Stripe. Más
        información sobre las cookies en la <Link href="/legal/cookies">política de cookies</Link>.
      </p>
    </PaginaLegal>
  );
}
