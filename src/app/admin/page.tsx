import { Cabecera } from "@/components/admin/Cabecera";
import { exigirAdmin } from "@/lib/sesion";

/** INICIO DEL PANEL */
export default async function InicioAdmin() {
  const admin = await exigirAdmin("/admin");
  return (
    <Cabecera
      titulo={`Hola, ${admin.nombre.split(" ")[0]}`}
      descripcion="Panel de administración de Valentia."
    />
  );
}
