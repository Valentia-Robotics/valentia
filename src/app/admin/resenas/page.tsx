import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { BotonPublicarResena } from "@/components/admin/BotonPublicarResena";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { leerPagina, Paginacion } from "@/components/admin/Paginacion";
import { Tabla } from "@/components/admin/Tabla";
import { Estrellas } from "@/components/resenas/Estrellas";
import { configResenas } from "@/config/resenas";
import type { EstadoResena } from "@/generated/prisma/enums";
import { fecha } from "@/lib/admin/formato";
import { buscarResenas } from "@/lib/admin/resenas";
import { exigirAdmin } from "@/lib/sesion";
import { cn, plural } from "@/lib/utils";
import { borrarResena } from "./acciones";

export const metadata: Metadata = { title: "Reseñas" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const ESTADOS: Record<EstadoResena, { nombre: string; tono: "exito" | "aviso" | "neutro" }> = {
  PUBLICADA: { nombre: "Publicadas", tono: "exito" },
  PENDIENTE: { nombre: "Pendientes", tono: "aviso" },
  OCULTA: { nombre: "Ocultas", tono: "neutro" },
};

function leerEstado(valor: unknown): EstadoResena | "" {
  return typeof valor === "string" && valor in ESTADOS ? (valor as EstadoResena) : "";
}

/** RESEÑAS: todas las opiniones de los kits, con filtro por estado, para ocultarlas o borrarlas */
export default async function ResenasAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/resenas");
  const parametros = await searchParams;
  const estado = leerEstado(parametros.estado);
  const pagina = leerPagina(parametros.pagina);
  const { resenas, total, cuantos, totalPaginas } = await buscarResenas(estado, pagina);
  const todas = Object.values(cuantos).reduce((t, n) => t + (n ?? 0), 0);
  // «Pendientes» solo tiene sentido si se revisan antes de publicar (o si queda alguna de antes)
  const filtros = (Object.keys(ESTADOS) as EstadoResena[]).filter(
    (e) => e !== "PENDIENTE" || configResenas.revisarAntesDePublicar || cuantos.PENDIENTE,
  );

  return (
    <>
      <Cabecera
        titulo="Reseñas"
        descripcion={`${plural(total, "reseña", "reseñas")}. Solo opina quien ha activado el código del kit; ${
          configResenas.revisarAntesDePublicar
            ? "las nuevas esperan a que las publiques."
            : "se publican al momento y puedes ocultarlas."
        }`}
      />

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2 text-sm">
        {(["", ...filtros] as const).map((valor) => {
          const activo = valor === estado;
          return (
            <Link
              key={valor || "todas"}
              href={valor ? `/admin/resenas?estado=${valor}` : "/admin/resenas"}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 ring-1 transition-colors",
                activo ? "bg-tinta text-white ring-tinta" : "ring-linea hover:bg-niebla",
              )}
            >
              {valor ? ESTADOS[valor].nombre : "Todas"}{" "}
              <span className="tabular-nums opacity-70">
                {valor ? (cuantos[valor] ?? 0) : todas}
              </span>
            </Link>
          );
        })}
      </nav>

      <Caja sinRelleno>
        <Tabla
          columnas={["Opinión", "Kit", "Cliente", "Estado", ""]}
          vacia={resenas.length === 0 && "Todavía no hay ninguna reseña aquí."}
        >
          {resenas.map((r) => (
            <tr key={r.id}>
              <td className="min-w-64">
                <Estrellas nota={r.estrellas} />
                <p className="mt-1 whitespace-pre-line">{r.texto}</p>
                <p className="mt-1 text-xs text-gris">{fecha(r.actualizadoEn)}</p>
              </td>
              <td>
                <Link href={`/kits/${r.kit.slug}#opiniones`} className="hover:underline">
                  {r.kit.nombre}
                </Link>
              </td>
              <td>
                <p className="font-medium">{r.usuario.nombre}</p>
                <p className="text-xs text-gris">{r.usuario.email}</p>
              </td>
              <td>
                <Insignia tono={ESTADOS[r.estado].tono}>
                  {ESTADOS[r.estado].nombre.slice(0, -1)}
                </Insignia>
              </td>
              <td>
                <div className="flex justify-end gap-2">
                  <BotonPublicarResena id={r.id} publicada={r.estado === "PUBLICADA"} />
                  <BotonConfirmar
                    accion={borrarResena}
                    datos={{ id: r.id }}
                    titulo="¿Borrar esta reseña?"
                    texto="Se borra para siempre. Si solo quieres que no se vea, mejor ocúltala."
                    pequeno
                  >
                    Borrar
                  </BotonConfirmar>
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
        <Paginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          ruta="/admin/resenas"
          filtros={{ estado }}
        />
      </Caja>
    </>
  );
}
