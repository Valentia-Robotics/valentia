import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { datosMigas } from "@/lib/datosEstructurados";
import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { Configurador } from "@/components/configurador/Configurador";
import { obtenerComponentes, obtenerKitsParaConfigurador } from "@/lib/catalogo";

export const metadata: Metadata = metadatosPagina({
  titulo: "Configurador: crea tu robot pieza a pieza",
  descripcion:
    "Elige placa, motores y sensores y monta tu robot pieza a pieza. Si algo no encaja, te avisamos y te decimos qué falta.",
  ruta: "/configurador",
});

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
    <>
      <DatosEstructurados
        datos={datosMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Configurador", ruta: "/configurador" },
        ])}
      />
      <Configurador
        componentes={componentes}
        kits={kits}
        kitInicial={typeof kit === "string" ? kit : null}
      />
    </>
  );
}
