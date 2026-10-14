import type { Metadata } from "next";
import { Configurador } from "@/components/configurador/Configurador";
import { obtenerComponentes, obtenerKitsParaConfigurador } from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Configurador",
  description:
    "Crea tu propio robot pieza a pieza. Te avisamos si algo no encaja para que aciertes a la primera.",
};

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/**
 * CONFIGURADOR. La página lee el catálogo de la base de datos y se lo pasa al
 * componente <Configurador />, que funciona en el navegador.
 * Con /configurador?kit=slug se abre con las piezas de ese kit ya cargadas.
 */
export default async function PaginaConfigurador({ searchParams }: Props) {
  const { kit } = await searchParams;
  const [componentes, kits] = await Promise.all([
    obtenerComponentes(),
    obtenerKitsParaConfigurador(),
  ]);

  return (
    <Configurador
      componentes={componentes}
      kits={kits}
      kitInicial={typeof kit === "string" ? kit : null}
    />
  );
}
