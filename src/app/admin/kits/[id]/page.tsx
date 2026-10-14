import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { borrarKit } from "@/app/admin/kits/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioKit } from "@/components/admin/FormularioKit";
import { Insignia } from "@/components/admin/Insignia";
import {
  componentesParaKits,
  cursosLibres,
  obtenerKitAdmin,
  unidadesPedidas,
} from "@/lib/admin/kits";
import { listaDeTextos } from "@/lib/catalogo";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar kit" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** EDITAR UN KIT */
export default async function EditarKit({ params, searchParams }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/kits/${id}`);
  const [kit, piezas, cursos, { creado }] = await Promise.all([
    obtenerKitAdmin(id),
    componentesParaKits(),
    cursosLibres(id),
    searchParams,
  ]);
  if (!kit) notFound();
  const pedidos = await unidadesPedidas(kit.slug);
  const sePuedeBorrar = kit._count.codigos === 0 && pedidos === 0;

  return (
    <>
      <Cabecera
        titulo={kit.nombre}
        volver={{ href: "/admin/kits", etiqueta: "Kits" }}
        descripcion={
          <>
            {kit.visible ? <Insignia tono="exito">Visible</Insignia> : <Insignia>Oculto</Insignia>}{" "}
            {plural(kit._count.codigos, "código de activación", "códigos de activación")}
          </>
        }
        acciones={
          <>
            <BotonAdmin href={`/admin/codigos?kit=${kit.id}`} variante="secundario">
              Códigos
            </BotonAdmin>
            {kit.visible && (
              <BotonAdmin href={`/kits/${kit.slug}`} variante="secundario" target="_blank">
                Ver en la tienda
              </BotonAdmin>
            )}
            <BotonConfirmar
              accion={borrarKit}
              datos={{ id: kit.id }}
              titulo="¿Borrar este kit?"
              texto={
                sePuedeBorrar ? (
                  <>
                    Vas a borrar <strong>{kit.nombre}</strong> y su foto. No se puede deshacer. Sus
                    componentes y su curso no se borran.
                  </>
                ) : (
                  <>
                    <strong>{kit.nombre}</strong> ya tiene códigos de activación o pedidos, así que
                    no se puede borrar. Si no quieres venderlo más, desmarca «Visible en la tienda».
                  </>
                )
              }
            >
              Borrar
            </BotonConfirmar>
          </>
        }
      />
      {creado && (
        <Aviso tipo="exito" className="mb-4">
          Kit creado. Ya está en la tienda. Genera sus códigos QR en «Códigos».
        </Aviso>
      )}
      <FormularioKit
        piezas={piezas}
        cursos={cursos}
        kit={{
          ...kit,
          puntosFuertes: listaDeTextos(kit.puntosFuertes),
          componentes: kit.componentes.map((c) => ({ id: c.componenteId, cantidad: c.cantidad })),
        }}
      />
    </>
  );
}
