import type { Metadata } from "next";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { CampoAdmin } from "@/components/admin/campos";
import { Tabla } from "@/components/admin/Tabla";
import { porcentaje } from "@/lib/admin/formato";
import { datosParaMetricas } from "@/lib/contenido/guiones";
import { calcularMetricas, duracionLegible } from "@/lib/contenido/metricas";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = { title: "Métricas de contenido" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** Día "2026-11-30" de la dirección → fecha, o undefined si no es un día válido */
function leerDia(valor: unknown, hora: string): Date | undefined {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
  const fecha = new Date(`${valor}T${hora}Z`);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

/** MÉTRICAS POR EDITOR: solo existen aquí, en el panel de admin */
export default async function MetricasContenido({ searchParams }: Props) {
  await exigirAdmin("/admin/contenido/metricas");
  const { desde, hasta } = await searchParams;
  const { eventos, guiones, personas } = await datosParaMetricas();
  const metricas = calcularMetricas(eventos, guiones, {
    desde: leerDia(desde, "00:00:00.000"),
    hasta: leerDia(hasta, "23:59:59.999"),
  });
  const porEditor = new Map(metricas.map((m) => [m.editorId, m]));

  return (
    <>
      <Cabecera
        titulo="Métricas por editor"
        descripcion="Salen del historial de cada guion. «En progreso» es lo que tiene ahora mismo; lo demás, lo ocurrido en las fechas elegidas. Tiempo medio: de la asignación a la primera entrega."
        volver={{ href: "/admin/contenido", etiqueta: "Contenido" }}
      />

      <form className="mb-4 grid gap-3 sm:grid-cols-[12rem_12rem_auto] sm:items-end sm:justify-start">
        <CampoAdmin
          etiqueta="Desde"
          name="desde"
          type="date"
          defaultValue={typeof desde === "string" ? desde : ""}
        />
        <CampoAdmin
          etiqueta="Hasta"
          name="hasta"
          type="date"
          defaultValue={typeof hasta === "string" ? hasta : ""}
        />
        <BotonAdmin type="submit" variante="secundario">
          Filtrar
        </BotonAdmin>
      </form>

      <Caja sinRelleno>
        <Tabla
          etiqueta="Métricas por editor"
          columnas={[
            "Editor",
            "Asignados",
            "En progreso",
            "Entregados",
            "Completados",
            "Devueltos",
            "Tiempo medio",
            "A tiempo",
          ]}
          vacia={personas.length === 0 && "Todavía no hay editores."}
        >
          {personas.map((persona) => {
            const m = porEditor.get(persona.id);
            return (
              <tr key={persona.id}>
                <td>
                  <p className="font-medium">{persona.nombre}</p>
                  <p className="text-xs text-gris">{persona.email}</p>
                </td>
                <td className="tabular-nums">{m?.asignados ?? 0}</td>
                <td className="tabular-nums">{m?.enProgreso ?? 0}</td>
                <td className="tabular-nums">{m?.entregados ?? 0}</td>
                <td className="tabular-nums">{m?.completados ?? 0}</td>
                <td className="tabular-nums">{m?.devueltos ?? 0}</td>
                <td className="whitespace-nowrap">
                  {m?.tiempoMedioMs == null ? "—" : duracionLegible(m.tiempoMedioMs)}
                </td>
                <td className="tabular-nums">{porcentaje(m?.aTiempo ?? 0, m?.entregados ?? 0)}</td>
              </tr>
            );
          })}
        </Tabla>
      </Caja>
    </>
  );
}
