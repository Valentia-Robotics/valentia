import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaCuenta } from "@/components/cuenta/TarjetaCuenta";
import { Boton } from "@/components/ui/Boton";
import { esId } from "@/lib/ids";
import { firmaBajaValida } from "@/lib/novedades/baja";
import { confirmarBaja } from "./acciones";

export const metadata: Metadata = { title: "Darme de baja", robots: { index: false } };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/**
 * DARSE DE BAJA DE LOS CORREOS DE NOVEDADES: el enlace que va al pie de cada correo.
 * No da de baja solo con abrirlo (los antivirus del correo abren los enlaces): hay que pulsar el botón.
 */
export default async function PaginaBaja({ searchParams }: Props) {
  const { u, t, hecho } = await searchParams;
  const valido = esId(u) && typeof t === "string" && firmaBajaValida(u, t);

  if (!valido) {
    return (
      <TarjetaCuenta
        titulo="Este enlace no funciona."
        subtitulo="Puede que se haya cortado al copiarlo. Usa el enlace del último correo o entra en tu cuenta."
      >
        <p className="mt-6 text-gris">
          También puedes dejar de recibir novedades desde{" "}
          <Link href="/cuenta#novedades" className="text-acento underline underline-offset-4">
            Mi cuenta
          </Link>
          .
        </p>
      </TarjetaCuenta>
    );
  }

  if (hecho) {
    return (
      <TarjetaCuenta
        titulo="Hecho."
        subtitulo="No te mandaremos más correos de novedades. Los de tus pedidos y tu cuenta te seguirán llegando."
      >
        <p className="mt-6 text-gris">
          Si algún día cambias de idea, puedes volver a apuntarte en{" "}
          <Link href="/cuenta#novedades" className="text-acento underline underline-offset-4">
            Mi cuenta
          </Link>
          .
        </p>
      </TarjetaCuenta>
    );
  }

  return (
    <TarjetaCuenta
      titulo="¿Dejamos de escribirte?"
      subtitulo="Pulsa el botón y no te mandaremos más correos de novedades (kits nuevos y cosas así)."
    >
      <form action={confirmarBaja} className="mt-8">
        <input type="hidden" name="u" value={u} />
        <input type="hidden" name="t" value={t} />
        <Boton type="submit" variante="acento" tamano="lg" className="w-full">
          Sí, darme de baja
        </Boton>
      </form>
      <p className="mt-4 text-center text-sm text-gris">
        Los correos de tus pedidos y de tu cuenta te seguirán llegando.
      </p>
    </TarjetaCuenta>
  );
}
