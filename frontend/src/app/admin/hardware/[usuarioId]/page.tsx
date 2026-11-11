import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/admin/Cabecera";
import { EspacioArchivos } from "@/components/hardware/EspacioArchivos";
import { tieneEspacioHardware } from "@/config/equipo";
import { duenoDeEspacio } from "@/lib/hardware/archivos";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Espacio de hardware" };

interface Props {
  params: Promise<{ usuarioId: string }>;
  searchParams: Promise<{ carpeta?: string | string[] }>;
}

/** EL ESPACIO DE UNA PERSONA DE HARDWARE, visto por la administración */
export default async function EspacioHardwareAdmin({ params, searchParams }: Props) {
  const { usuarioId } = await params;
  const { carpeta } = await searchParams;
  await exigirAdmin(`/admin/hardware/${usuarioId}`);
  const dueno = await duenoDeEspacio(usuarioId);
  if (!dueno) notFound();

  return (
    <>
      <Cabecera
        titulo={`Espacio de ${dueno.nombre}`}
        descripcion={dueno.email}
        volver={{ href: "/admin/hardware", etiqueta: "Hardware" }}
      />
      <EspacioArchivos
        duenoId={dueno.id}
        paraAdmin
        puedeSubir={tieneEspacioHardware(dueno)}
        pagina={`/admin/hardware/${dueno.id}`}
        carpeta={typeof carpeta === "string" ? carpeta : ""}
      />
    </>
  );
}
