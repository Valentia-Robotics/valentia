import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { FormularioCategoria } from "@/components/contenido/FormulariosRevision";
import { cambiarCategoria } from "@/app/admin/contenido/acciones";
import { categoriasGuion } from "@/lib/contenido/guiones";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Categorías de guiones" };

/** La lista cerrada de categorías: el admin la amplía aquí */
export default async function CategoriasGuion() {
  await exigirAdmin("/admin/contenido/categorias");
  const categorias = await categoriasGuion();

  return (
    <>
      <Cabecera
        titulo="Categorías de guiones"
        descripcion="Los guiones solo pueden usar categorías de esta lista."
        volver={{ href: "/admin/contenido", etiqueta: "Contenido" }}
      />
      <div className="space-y-4">
        <Caja>
          <FormularioCategoria />
        </Caja>
        <Caja sinRelleno>
          <Tabla columnas={["Categoría", "Estado", ""]}>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.nombre}</td>
                <td>
                  <Insignia tono={c.activa ? "exito" : "neutro"}>
                    {c.activa ? "Activa" : "Desactivada"}
                  </Insignia>
                </td>
                <td className="text-right">
                  <BotonConfirmar
                    accion={cambiarCategoria}
                    datos={{ categoriaId: c.id, activa: c.activa ? "no" : "si" }}
                    titulo={c.activa ? "Desactivar categoría" : "Reactivar categoría"}
                    texto={
                      c.activa
                        ? "No se podrá elegir en guiones nuevos. Los que ya la usan la conservan."
                        : "Se podrá volver a elegir en los guiones."
                    }
                    confirmar={c.activa ? "Sí, desactivar" : "Sí, reactivar"}
                    variante="secundario"
                    pequeno
                  >
                    {c.activa ? "Desactivar" : "Reactivar"}
                  </BotonConfirmar>
                </td>
              </tr>
            ))}
          </Tabla>
        </Caja>
      </div>
    </>
  );
}
