import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { borrarComponente } from "@/app/admin/componentes/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioComponente } from "@/components/admin/FormularioComponente";
import { Insignia } from "@/components/admin/Insignia";
import { obtenerComponenteAdmin, tiposDePieza } from "@/lib/admin/componentes";
import { listaDeEspecificaciones } from "@/lib/catalogo";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Editar componente" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** EDITAR UN COMPONENTE */
export default async function EditarComponente({ params, searchParams }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/componentes/${id}`);
  const [componente, tipos, { creado }] = await Promise.all([
    obtenerComponenteAdmin(id),
    tiposDePieza(),
    searchParams,
  ]);
  if (!componente) notFound();
  const kits = componente.enKits.map((k) => k.kit);

  return (
    <>
      <Cabecera
        titulo={componente.nombre}
        volver={{ href: "/admin/componentes", etiqueta: "Componentes" }}
        descripcion={
          <>
            {componente.visible ? (
              <Insignia tono="exito">Visible</Insignia>
            ) : (
              <Insignia>Oculto</Insignia>
            )}{" "}
            {kits.length > 0 ? (
              <>
                Está en:{" "}
                {kits.map((k, i) => (
                  <span key={k.id}>
                    {i > 0 && ", "}
                    <Link href={`/admin/kits/${k.id}`} className="underline">
                      {k.nombre}
                    </Link>
                  </span>
                ))}
              </>
            ) : (
              "No está en ningún kit."
            )}
          </>
        }
        acciones={
          <>
            <BotonAdmin href="/componentes" variante="secundario" target="_blank">
              Ver en la tienda
            </BotonAdmin>
            <BotonConfirmar
              accion={borrarComponente}
              datos={{ id: componente.id }}
              titulo="¿Borrar este componente?"
              texto={
                <>
                  Vas a borrar <strong>{componente.nombre}</strong> y su foto. No se puede deshacer.
                  Los pedidos antiguos no cambian: guardan su propia copia.
                  {kits.length > 0 &&
                    " Como está dentro de algún kit, no se podrá borrar: ocúltalo desmarcando «Visible»."}
                </>
              }
            >
              Borrar
            </BotonConfirmar>
          </>
        }
      />
      {creado && (
        <Aviso tipo="exito" className="mb-4">
          Componente creado. Ya está en la tienda y en el configurador.
        </Aviso>
      )}
      <FormularioComponente
        tipos={tipos}
        componente={{
          ...componente,
          especificaciones: listaDeEspecificaciones(componente.especificaciones),
        }}
      />
    </>
  );
}
