import Link from "next/link";

/** Convierte [texto](/ruta) en enlaces dentro de un texto de las guías (el resto, tal cual) */
export function TextoConEnlaces({ texto }: { texto: string }) {
  const trozos = texto.split(/(\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {trozos.map((trozo, i) => {
        const enlace = trozo.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (!enlace) return trozo;
        return (
          <Link
            key={i}
            href={enlace[2]}
            className="font-medium text-acento underline underline-offset-2 hover:text-acento-hover"
          >
            {enlace[1]}
          </Link>
        );
      })}
    </>
  );
}
