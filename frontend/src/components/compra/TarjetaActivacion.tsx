import Image from "next/image";
import { Logo } from "@/components/marca/Logo";
import { generarQrSvg, urlActivacion } from "@/lib/qr";

interface Props {
  codigo: string;
  nombreKit: string;
}

/**
 * Tarjeta de activación tal y como se imprime para la caja del kit:
 * logo, nombre del kit, QR con el monograma de Valentia en el centro y el código escrito.
 */
export async function TarjetaActivacion({ codigo, nombreKit }: Props) {
  const url = urlActivacion(codigo);
  const svg = await generarQrSvg(url);
  // Dirección corta para escribirla a mano si el móvil no lee el QR
  const direccionVisible = url.replace(/^https?:\/\//, "").split("?")[0];

  return (
    <article
      aria-label={`Tarjeta de activación del kit ${nombreKit}`}
      className="mx-auto flex w-full max-w-[22rem] break-inside-avoid flex-col items-center rounded-tarjeta bg-white px-8 pt-8 pb-7 text-center text-tinta ring-1 ring-linea print:shadow-none print:ring-tinta"
    >
      <Logo alto={16} />
      <p className="mt-6 text-xs tracking-[0.2em] text-gris uppercase">Tu curso te espera</p>
      <p className="mt-1 font-titulo text-xl font-medium">{nombreKit}</p>

      <div className="relative mt-5 w-full max-w-56">
        {/* El SVG lo genera nuestro servidor con la librería qrcode: es contenido de confianza */}
        <div
          role="img"
          aria-label={`Código QR que abre ${url}`}
          className="[&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {/* Monograma "V" en el centro (el QR sigue leyéndose gracias a la corrección "H") */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-[22%] bg-white p-1">
            <Image
              src="/images/brand/monograma.svg"
              alt=""
              width={44}
              height={44}
              unoptimized
              className="size-11"
            />
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs text-gris">Tu código</p>
      <p className="font-mono text-2xl font-semibold tracking-wider">{codigo}</p>
      <p className="mt-4 text-xs leading-relaxed text-gris">
        Escanea el QR con el móvil o entra en
        <br />
        <span className="font-medium text-tinta">{direccionVisible}</span> y escribe el código.
      </p>
    </article>
  );
}
