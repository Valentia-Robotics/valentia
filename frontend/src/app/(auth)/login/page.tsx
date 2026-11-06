import type { Metadata } from "next";
import { PaginaCuenta } from "@/components/cuenta/PaginaCuenta";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

/** INICIAR SESIÓN. Con ?callbackUrl=/ruta vuelve allí después de entrar. */
export default function PaginaLogin(props: {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}) {
  return <PaginaCuenta modo="login" searchParams={props.searchParams} />;
}
