import type { Metadata } from "next";
import { PaginaCuenta } from "@/components/cuenta/PaginaCuenta";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

/** CREAR CUENTA. Con ?callbackUrl=/ruta vuelve allí después de registrarse. */
export default function PaginaRegistro(props: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  return <PaginaCuenta modo="registro" searchParams={props.searchParams} />;
}
