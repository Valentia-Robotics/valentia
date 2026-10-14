import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/admin/Aviso";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioKit } from "@/components/admin/FormularioKit";
import { componentesParaKits, cursosLibres } from "@/lib/admin/kits";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nuevo kit" };

/** CREAR UN KIT */
export default async function NuevoKit() {
  await exigirAdmin("/admin/kits/nuevo");
  const [piezas, cursos] = await Promise.all([componentesParaKits(), cursosLibres()]);

  return (
    <>
      <Cabecera titulo="Nuevo kit" volver={{ href: "/admin/kits", etiqueta: "Kits" }} />
      {cursos.length === 0 && (
        <Aviso tipo="info" className="mb-4">
          Todos los cursos tienen ya su kit. Cada kit necesita su propio curso: crea uno nuevo en{" "}
          <Link href="/admin/cursos/nuevo" className="underline">
            Cursos
          </Link>{" "}
          y vuelve aquí.
        </Aviso>
      )}
      <FormularioKit piezas={piezas} cursos={cursos} />
    </>
  );
}
