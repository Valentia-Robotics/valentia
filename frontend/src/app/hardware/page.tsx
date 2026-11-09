import type { Metadata } from "next";
import { Cabecera } from "@/components/admin/Cabecera";
import { EspacioArchivos } from "@/components/hardware/EspacioArchivos";
import { exigirHardware } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mi espacio" };

/** MI ESPACIO: los archivos de esta persona de hardware (solo los ven ella y los administradores) */
export default async function MiEspacio() {
  const persona = await exigirHardware();
  return (
    <>
      <Cabecera
        titulo="Mi espacio"
        descripcion="Tus archivos de trabajo. Solo los ves tú y la administración de Valentia."
      />
      <EspacioArchivos duenoId={persona.id} />
    </>
  );
}
