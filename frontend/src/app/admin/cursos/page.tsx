import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Aviso } from "@/components/admin/Aviso";
import { BarraPorcentaje } from "@/components/admin/BarraPorcentaje";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { listarCursosAdmin } from "@/lib/admin/cursos";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Cursos" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** CURSOS: lista con su kit, sus lecciones y el progreso medio de los alumnos */
export default async function CursosAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/cursos");
  const [cursos, { borrado }] = await Promise.all([listarCursosAdmin(), searchParams]);

  return (
    <>
      <Cabecera
        titulo="Cursos"
        descripcion="Cada kit incluye un curso. El alumno lo recibe al activar el código QR de la caja."
        acciones={
          <BotonAdmin href="/admin/cursos/nuevo">
            <Plus aria-hidden="true" className="size-4" />
            Nuevo curso
          </BotonAdmin>
        }
      />
      {borrado && (
        <Aviso tipo="exito" className="mb-4">
          Curso borrado.
        </Aviso>
      )}

      <Caja sinRelleno>
        <Tabla
          columnas={["Curso", "Kit", "Lecciones", "Alumnos", "Progreso medio", ""]}
          vacia={cursos.length === 0 && "Todavía no hay cursos."}
        >
          {cursos.map((c) => (
            <tr key={c.id}>
              <td>
                <Link href={`/admin/cursos/${c.id}`} className="font-medium hover:underline">
                  {c.titulo}
                </Link>
                <p className="text-xs text-gris">{c.nivel}</p>
              </td>
              <td>
                {c.kit ? (
                  <Link href={`/admin/kits/${c.kit.id}`} className="hover:underline">
                    {c.kit.nombre}
                  </Link>
                ) : (
                  <Insignia tono="aviso">Sin kit</Insignia>
                )}
              </td>
              <td className="tabular-nums">{c._count.lecciones}</td>
              <td className="tabular-nums">
                {c.progreso.alumnos}
                {c.progreso.terminados > 0 && (
                  <span className="block text-xs text-gris">
                    {plural(c.progreso.terminados, "lo ha terminado", "lo han terminado")}
                  </span>
                )}
              </td>
              <td className="min-w-40">
                <BarraPorcentaje valor={c.progreso.medio} />
              </td>
              <td>
                <BotonAdmin href={`/admin/cursos/${c.id}`} variante="secundario" pequeno>
                  Editar
                </BotonAdmin>
              </td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}
