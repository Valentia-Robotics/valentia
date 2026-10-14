import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { BookOpen, CircleAlert, CircleCheck, QrCode } from "lucide-react";
import { BotonActivar } from "@/components/cursos/BotonActivar";
import { FormularioCodigo } from "@/components/cursos/FormularioCodigo";
import { Boton } from "@/components/ui/Boton";
import { buscarCodigo } from "@/lib/activacion";
import { FORMATO_CODIGO, normalizarCodigo } from "@/lib/codigos";
import { db } from "@/lib/db";
import { ipDelCliente, registrarIntento } from "@/lib/limite";
import { obtenerUsuario } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Activar mi kit",
  description: "Escanea el QR de tu caja o escribe el código para desbloquear tu curso.",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/**
 * ACTIVAR UN KIT: /activar?codigo=VAL-XXXX-XXXX (es lo que abre el QR de la caja).
 * - Sin código: formulario para escribirlo.
 * - Sin sesión: pide iniciar sesión o crear cuenta y después vuelve aquí.
 * - Con sesión: comprueba el código y ofrece el botón "Activar mi curso".
 */
export default async function PaginaActivar({ searchParams }: Props) {
  const { codigo: crudo } = await searchParams;
  const codigo = typeof crudo === "string" && crudo.trim() ? normalizarCodigo(crudo) : null;
  const usuario = await obtenerUsuario();

  // ---------- Sin código: formulario ----------
  if (!codigo) {
    return (
      <Marco
        icono={<QrCode aria-hidden="true" className="size-10 text-acento" strokeWidth={1.5} />}
        titulo="Activa tu kit."
        texto="Escanea con el móvil el QR de la tarjeta que viene en la caja, o escribe aquí el código."
      >
        <div className="mt-8">
          <FormularioCodigo />
        </div>
      </Marco>
    );
  }

  // Máximo de consultas por IP, para que nadie pueda ir probando códigos al azar
  if (!registrarIntento("consultarCodigo", await ipDelCliente())) {
    return (
      <Marco
        icono={<CircleAlert aria-hidden="true" className="size-10 text-aviso" strokeWidth={1.5} />}
        titulo="Demasiados intentos."
        texto="Has probado muchos códigos seguidos. Espera unos minutos y vuelve a escanear el QR de tu caja."
      />
    );
  }

  const encontrado = FORMATO_CODIGO.test(codigo) ? await buscarCodigo(codigo) : null;

  // ---------- Código que no existe ----------
  if (!encontrado) {
    return (
      <Marco
        icono={<CircleAlert aria-hidden="true" className="size-10 text-error" strokeWidth={1.5} />}
        titulo="No encontramos ese código."
        texto={`Revisa que lo has escrito igual que en la tarjeta (por ejemplo, VAL-7KQ2-M9XD). Has escrito: ${codigo}`}
      >
        <div className="mt-8">
          <FormularioCodigo valor={codigo} />
        </div>
      </Marco>
    );
  }

  const { kit } = encontrado;
  const volverAqui = `/activar?codigo=${encodeURIComponent(codigo)}`;
  const tarjetaKit = (
    <div className="mt-8 flex items-center gap-4 rounded-tarjeta bg-niebla p-4 text-left">
      <Image
        src={kit.imagen}
        alt=""
        width={120}
        height={90}
        unoptimized
        className="h-16 w-20 shrink-0 object-contain"
      />
      <div>
        <p className="text-xs text-gris">Kit {kit.nombre}</p>
        <p className="font-medium">{kit.curso.titulo}</p>
      </div>
    </div>
  );

  // ---------- Código ya usado ----------
  if (encontrado.usadoEn && encontrado.usuarioId !== usuario?.id) {
    return (
      <Marco
        icono={<CircleAlert aria-hidden="true" className="size-10 text-aviso" strokeWidth={1.5} />}
        titulo="Este código ya se ha usado."
        texto="Cada código solo sirve una vez. Si crees que es un error, escríbenos y lo revisamos."
      >
        {tarjetaKit}
      </Marco>
    );
  }

  // ---------- Sin sesión: entrar o crear cuenta (y volver aquí) ----------
  if (!usuario) {
    const volver = `?callbackUrl=${encodeURIComponent(volverAqui)}`;
    return (
      <Marco
        icono={<CircleCheck aria-hidden="true" className="size-10 text-exito" strokeWidth={1.5} />}
        titulo="¡Tu curso te espera!"
        texto="El código es válido. Inicia sesión o crea una cuenta gratis para guardarlo en «Mis cursos»."
      >
        {tarjetaKit}
        <div className="mt-8 flex flex-col gap-3">
          <Boton href={`/registro${volver}`} variante="acento" tamano="xl" className="w-full">
            Crear cuenta gratis
          </Boton>
          <Boton href={`/login${volver}`} variante="secundario" tamano="lg" className="w-full">
            Ya tengo cuenta: iniciar sesión
          </Boton>
        </div>
      </Marco>
    );
  }

  // ---------- Con sesión: ¿ya tiene el curso? ----------
  const yaLoTiene = await db.cursoUsuario.findUnique({
    where: { usuarioId_cursoId: { usuarioId: usuario.id, cursoId: kit.curso.id } },
  });
  if (yaLoTiene) {
    return (
      <Marco
        icono={<BookOpen aria-hidden="true" className="size-10 text-acento" strokeWidth={1.5} />}
        titulo="Ya tienes este curso."
        texto={
          encontrado.usadoEn
            ? "Activaste este código antes. ¡Sigue donde lo dejaste!"
            : "No hemos gastado este código: puedes regalárselo a otra persona."
        }
      >
        {tarjetaKit}
        <Boton
          href={`/cursos/${kit.curso.slug}`}
          variante="acento"
          tamano="xl"
          className="mt-8 w-full"
        >
          Ir al curso
        </Boton>
      </Marco>
    );
  }

  return (
    <Marco
      icono={<CircleCheck aria-hidden="true" className="size-10 text-exito" strokeWidth={1.5} />}
      titulo={`¡Hola, ${usuario.nombre.split(" ")[0]}! Tu curso te espera.`}
      texto="Pulsa el botón y el curso quedará guardado para siempre en «Mis cursos»."
    >
      {tarjetaKit}
      <p className="mt-4 text-center font-mono text-sm text-gris">{codigo}</p>
      <BotonActivar codigo={codigo} />
    </Marco>
  );
}

/** Tarjeta centrada que comparten todos los estados de la página */
function Marco({
  icono,
  titulo,
  texto,
  children,
}: {
  icono: ReactNode;
  titulo: string;
  texto: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex justify-center bg-niebla px-4 py-12 sm:py-20">
      <div className="w-full max-w-lg rounded-tarjeta bg-white p-8 text-center shadow-tarjeta sm:p-10">
        <div className="flex justify-center">{icono}</div>
        <h1 className="mt-5 text-3xl font-medium">{titulo}</h1>
        <p className="mt-3 text-gris">{texto}</p>
        {children}
      </div>
    </div>
  );
}
