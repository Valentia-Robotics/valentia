import { redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/sesion";
import { rutaSegura } from "@/lib/validaciones/cuenta";
import { FormularioCuenta } from "./FormularioCuenta";
import { TarjetaCuenta } from "./TarjetaCuenta";

interface Props {
  modo: "login" | "registro";
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const textos = {
  login: { titulo: "Hola de nuevo.", subtitulo: "Entra para seguir con tus cursos." },
  registro: {
    titulo: "Crea tu cuenta.",
    subtitulo: "Es gratis. La necesitas para activar el curso de tu kit y guardar tu progreso.",
  },
};

/** Página compartida por /login y /registro: tarjeta centrada con el formulario. */
export async function PaginaCuenta({ modo, searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  const volver = rutaSegura(callbackUrl);

  // Si ya has iniciado sesión, no tiene sentido enseñar el formulario
  if (await obtenerUsuario()) redirect(volver);

  const vieneDeActivar = volver.startsWith("/activar");

  return (
    <TarjetaCuenta
      titulo={textos[modo].titulo}
      subtitulo={
        vieneDeActivar
          ? "Inicia sesión o crea una cuenta y activaremos tu curso al momento."
          : textos[modo].subtitulo
      }
    >
      <FormularioCuenta modo={modo} volver={volver} />
    </TarjetaCuenta>
  );
}
