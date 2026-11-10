import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { cambiarVisibilidadKit } from "@/app/admin/kits/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonVisibilidad } from "@/components/admin/BotonVisibilidad";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { listarKitsAdmin } from "@/lib/admin/kits";
import { exigirCatalogo } from "@/lib/sesion";
import { plural, precioDeKit } from "@/lib/utils";

export const metadata: Metadata = { title: "Kits" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** KITS: lista con ventas, códigos y estado */
export default async function KitsAdmin({ searchParams }: Props) {
  await exigirCatalogo("/admin/kits");
  const [kits, { borrado }] = await Promise.all([listarKitsAdmin(), searchParams]);

  return (
    <>
      <Cabecera
        titulo="Kits"
        descripcion={`${plural(kits.length, "kit", "kits")}. Ordenados como en la tienda.`}
        acciones={
          <BotonAdmin href="/admin/kits/nuevo">
            <Plus aria-hidden="true" className="size-4" />
            Nuevo kit
          </BotonAdmin>
        }
      />
      {borrado && (
        <Aviso tipo="exito" className="mb-4">
          Kit borrado. Su curso queda libre para otro kit.
        </Aviso>
      )}

      <Caja sinRelleno>
        <Tabla
          columnas={["Kit", "Precio", "Vendidos", "Códigos", "Estado", ""]}
          vacia={kits.length === 0 && "Todavía no hay kits."}
        >
          {kits.map((k) => (
            <tr key={k.id}>
              <td>
                <div className="flex items-center gap-3">
                  <Image
                    src={k.imagen}
                    alt=""
                    width={48}
                    height={36}
                    unoptimized
                    className="h-9 w-12 shrink-0 rounded bg-niebla object-contain"
                  />
                  <div className="min-w-0">
                    <Link href={`/admin/kits/${k.id}`} className="font-medium hover:underline">
                      {k.nombre}
                    </Link>
                    {k.destacado && (
                      <Star
                        aria-label="Destacado en la portada"
                        className="ml-1 inline size-3.5 fill-aviso text-aviso"
                      />
                    )}
                    <p className="text-xs text-gris">
                      {plural(k._count.componentes, "pieza distinta", "piezas distintas")} · Curso:{" "}
                      {k.curso.titulo}
                    </p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap tabular-nums">
                {precioDeKit(k.precioCentimos)}
              </td>
              <td className="tabular-nums">{k.vendidos}</td>
              <td>
                <Link
                  href={`/admin/codigos?kit=${k.id}`}
                  className="tabular-nums underline-offset-2 hover:underline"
                >
                  {k._count.codigos}
                </Link>
              </td>
              <td>
                {k.visible ? (
                  <Insignia tono="exito">Visible</Insignia>
                ) : (
                  <Insignia>Oculto</Insignia>
                )}
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  <BotonVisibilidad accion={cambiarVisibilidadKit} id={k.id} visible={k.visible} />
                  <BotonAdmin href={`/admin/kits/${k.id}`} variante="secundario" pequeno>
                    Editar
                  </BotonAdmin>
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}
