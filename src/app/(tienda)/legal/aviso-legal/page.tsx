// ⚠ BORRADOR — pendiente de revisión por un profesional.
import type { Metadata } from "next";
import Link from "next/link";
import { DatosEmpresa, PaginaLegal } from "@/components/legal/PaginaLegal";
import { tienda } from "@/config/tienda";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Datos de la empresa titular de Valentia y condiciones de uso de la web.",
};

const e = tienda.empresa;

/** AVISO LEGAL (Ley 34/2002, de servicios de la sociedad de la información, LSSI-CE) */
export default function AvisoLegal() {
  return (
    <PaginaLegal titulo="Aviso legal" actualizado="17 de octubre de 2026">
      <h2>1. Quiénes somos</h2>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de servicios de la
        sociedad de la información y de comercio electrónico (LSSI-CE), te informamos de los datos
        del titular de esta web:
      </p>
      <DatosEmpresa
        datos={[
          ["Titular", e.razonSocial],
          ["Nombre comercial", e.nombreComercial],
          ["NIF", e.nif],
          ["Domicilio", e.direccion],
          ["Email", e.email],
          ["Teléfono", e.telefono],
          ["Datos registrales", e.registroMercantil],
          ["Dominio", e.dominio],
        ]}
      />

      <h2>2. Objeto</h2>
      <p>
        Esta web permite conocer y comprar kits de robótica y componentes electrónicos, montar un
        robot a medida con el configurador y acceder a los cursos en línea asociados a cada kit. La
        compra se rige además por las <Link href="/legal/condiciones">condiciones de venta</Link>.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        Al navegar por la web aceptas usarla de forma lícita y de buena fe. No está permitido
        intentar acceder a zonas restringidas, dañar o sobrecargar los sistemas, suplantar a otras
        personas ni usar los cursos o sus materiales para fines distintos del aprendizaje personal.
      </p>
      <p>
        Las cuentas son personales. Eres responsable de guardar tu contraseña y de los códigos de
        activación de tus kits. Podemos suspender una cuenta que incumpla estas condiciones.
      </p>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        Los textos, imágenes, vídeos, cursos, el logotipo y la marca «{e.nombreComercial}», así como
        el diseño y el código de la web, pertenecen a {e.razonSocial} o a sus licenciantes. No se
        pueden copiar, distribuir ni transformar sin autorización, salvo para uso personal y
        privado.
      </p>

      <h2>5. Responsabilidad</h2>
      <p>
        Trabajamos para que la información sea correcta y la web esté siempre disponible, pero no
        podemos garantizar la ausencia total de errores o interrupciones. Los proyectos de los
        cursos incluyen componentes eléctricos de baja tensión: sigue siempre las indicaciones de
        seguridad y, en el caso de menores, la supervisión de una persona adulta.
      </p>
      <p>
        Los enlaces a webs de terceros (por ejemplo, YouTube o Vimeo) se ofrecen por comodidad; no
        somos responsables de su contenido.
      </p>

      <h2>6. Protección de datos y cookies</h2>
      <p>
        Consulta la <Link href="/legal/privacidad">política de privacidad</Link> y la{" "}
        <Link href="/legal/cookies">política de cookies</Link>.
      </p>

      <h2>7. Ley aplicable</h2>
      <p>
        Estas condiciones se rigen por la ley española. Si eres consumidor, serán competentes los
        juzgados de tu domicilio.
      </p>
    </PaginaLegal>
  );
}
