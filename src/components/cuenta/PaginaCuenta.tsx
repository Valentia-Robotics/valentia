import { redirect } from "next/navigation";
import { Logo } from "@/components/marca/Logo";
import { obtenerUsuario } from "@/lib/sesion";
import { rutaSegura } from "@/lib/validaciones/cuenta";
import { FormularioCuenta } from "./FormularioCuenta";

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
    <div className="flex justify-center bg-niebla px-4 py-12 sm:py-20">
      <div className="w-full max-w-md rounded-tarjeta bg-white p-8 shadow-tarjeta sm:p-10">
        <Logo alto={14} />
        <h1 className="mt-8 text-3xl font-medium">{textos[modo].titulo}</h1>
        <p className="mt-2 text-gris">
          {vieneDeActivar
            ? "Inicia sesión o crea una cuenta y activaremos tu curso al momento."
            : textos[modo].subtitulo}
        </p>
        <FormularioCuenta modo={modo} volver={volver} />
      </div>
    </div>
  );
}
