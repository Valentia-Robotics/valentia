import type { Metadata } from "next";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioComponente } from "@/components/admin/FormularioComponente";
import { tiposDePieza } from "@/lib/admin/componentes";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nuevo componente" };

/** CREAR UN COMPONENTE */
export default async function NuevoComponente() {
  await exigirAdmin("/admin/componentes/nuevo");
  return (
    <>
      <Cabecera
        titulo="Nuevo componente"
        volver={{ href: "/admin/componentes", etiqueta: "Componentes" }}
      />
      <FormularioComponente tipos={await tiposDePieza()} />
    </>
  );
}
