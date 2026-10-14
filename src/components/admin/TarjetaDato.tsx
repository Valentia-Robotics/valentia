import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Tarjeta con una cifra del inicio del panel ("Usuarios registrados: 128") */
export function TarjetaDato({
  titulo,
  valor,
  detalle,
  icono: Icono,
  href,
}: {
  titulo: string;
  valor: string | number;
  detalle?: string;
  icono: LucideIcon;
  href?: string;
}) {
  const contenido = (
    <>
      <div className="flex items-center justify-between gap-2 text-gris">
        <p className="text-[13px]">{titulo}</p>
        <Icono aria-hidden="true" className="size-4" strokeWidth={1.8} />
      </div>
      <p className="mt-2 font-titulo text-3xl font-medium tabular-nums">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-gris">{detalle}</p>}
    </>
  );
  const clases = "block rounded-lg bg-white p-4 ring-1 ring-linea";
  return href ? (
    <Link href={href} className={`${clases} transition-shadow hover:ring-tinta/30`}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}
