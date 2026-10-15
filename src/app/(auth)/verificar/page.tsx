import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { FormularioCodigo } from "@/components/cuenta/FormularioCodigo";
import { TarjetaCuenta } from "@/components/cuenta/TarjetaCuenta";
import { Boton } from "@/components/ui/Boton";
import type { MotivoVerificacion } from "@/generated/prisma/enums";
import { rutaSegura } from "@/lib/validaciones/cuenta";
import { datosVerificacion } from "@/lib/verificacion/codigos";
import { CODIGO } from "@/lib/verificacion/reglas";

export const metadata: Metadata = { title: "Escribe tu código", robots: { index: false } };

const textos: Record<MotivoVerificacion, { titulo: string; intro: string }> = {
  REGISTRO: {
    titulo: "Confirma tu email.",
    intro: "Ya casi está. Te hemos enviado un código de 6 cifras a",
  },
  DISPOSITIVO: {
    titulo: "Confirma que eres tú.",
    intro:
      "Es la primera vez que entras desde este dispositivo. Te hemos enviado un código de 6 cifras a",
  },
  RECUPERAR: {
    titulo: "Revisa tu correo.",
    intro: "Si hay una cuenta con este email, te hemos enviado un código de 6 cifras a",
  },
};

/**
 * ESCRIBIR EL CÓDIGO RECIBIDO POR EMAIL (/verificar)
 * La verificación en curso se reconoce por una cookie segura (el email no va en la dirección).
 * Con ?callbackUrl=/ruta vuelve allí después de entrar.
 */
export default async function PaginaVerificar(props: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  const { callbackUrl } = await props.searchParams;
  const volver = rutaSegura(callbackUrl);
  const datos = await datosVerificacion();
  const enlaceLogin = `/login?callbackUrl=${encodeURIComponent(volver)}`;

  if (!datos) {
    return (
      <TarjetaCuenta
        titulo="No hay ningún código pendiente."
        subtitulo="Puede que ya lo hayas usado o que haya pasado demasiado tiempo. Vuelve a iniciar sesión y te enviaremos uno nuevo si hace falta."
      >
        <Boton href={enlaceLogin} variante="acento" tamano="lg" className="mt-8 w-full">
          Iniciar sesión
        </Boton>
      </TarjetaCuenta>
    );
  }

  // Código de "contraseña olvidada" ya confirmado: falta elegir la nueva
  if (datos.motivo === "RECUPERAR" && datos.confirmada) redirect("/recuperar/nueva");

  const texto = textos[datos.motivo];
  const reinicio =
    datos.motivo === "RECUPERAR"
      ? { href: "/recuperar", texto: "Volver a empezar" }
      : { href: enlaceLogin, texto: "Volver a iniciar sesión" };

  return (
    <TarjetaCuenta titulo={texto.titulo}>
      <p id="explicacion-codigo" className="mt-2 text-gris">
        <MailCheck aria-hidden="true" className="mr-1.5 mb-0.5 inline size-5 text-acento" />
        {texto.intro}{" "}
        <strong className="font-medium wrap-anywhere text-tinta">{datos.email}</strong>. Caduca en{" "}
        {CODIGO.minutosValidez} minutos.
      </p>
      <FormularioCodigo
        esperaInicial={datos.esperaReenvio}
        volver={volver}
        enlaceReinicio={reinicio}
        idDescripcion="explicacion-codigo"
      />
    </TarjetaCuenta>
  );
}
