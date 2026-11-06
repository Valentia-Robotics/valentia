import Link from "next/link";
import { Eye, LogIn, Users } from "lucide-react";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { GraficoVisitas } from "@/components/admin/GraficoVisitas";
import { ListaConBarras } from "@/components/admin/ListaConBarras";
import { TarjetaDato } from "@/components/admin/TarjetaDato";
import { PERIODOS, type obtenerVisitas } from "@/lib/admin/visitas";
import { cn, plural } from "@/lib/utils";

/** Contenido de /admin/visitas (separado de la página para poder verlo con datos de ejemplo) */
export function PanelVisitas({ v }: { v: Awaited<ReturnType<typeof obtenerVisitas>> }) {
  const periodo = v.dias;
  return (
    <>
      <Cabecera
        titulo="Visitas"
        descripcion="Quién entra en la web, qué mira y de dónde viene. Sin cookies: no sabemos quién es cada persona. Tus propias visitas (como administrador) no se cuentan."
      />

      <nav aria-label="Periodo" className="mb-4 flex flex-wrap gap-2 text-sm">
        {PERIODOS.map((dias) => (
          <Link
            key={dias}
            href={`/admin/visitas?dias=${dias}`}
            aria-current={dias === periodo ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 ring-1 transition-colors",
              dias === periodo ? "bg-tinta text-white ring-tinta" : "ring-linea hover:bg-niebla",
            )}
          >
            Últimos {dias} días
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <TarjetaDato
          titulo="Personas"
          valor={v.totalPersonas}
          detalle={`Hoy: ${v.hoy.personas}`}
          icono={Users}
        />
        <TarjetaDato
          titulo="Páginas vistas"
          valor={v.totalPaginas}
          detalle={`Hoy: ${v.hoy.paginas}`}
          icono={Eye}
        />
        <TarjetaDato
          titulo="Páginas por visita"
          valor={v.entradas ? (v.totalPaginas / v.entradas).toFixed(1).replace(".", ",") : "—"}
          detalle={plural(v.entradas, "visita a la web", "visitas a la web")}
          icono={LogIn}
        />
      </div>

      <Caja titulo={`Cada día (últimos ${v.dias} días)`} className="mt-6">
        <GraficoVisitas diario={v.diario} />
      </Caja>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Caja titulo="Páginas más vistas" sinRelleno>
          <ListaConBarras filas={v.paginas} vacia="Todavía no hay visitas en estos días." />
        </Caja>
        <Caja titulo="De dónde vienen" sinRelleno>
          <ListaConBarras filas={v.origenes} vacia="Todavía no hay visitas en estos días." />
        </Caja>
        <Caja titulo="Desde qué aparato" sinRelleno>
          <ListaConBarras filas={v.dispositivos} vacia="Todavía no hay visitas en estos días." />
        </Caja>
        <Caja titulo="Cómo leer estas cifras">
          <ul className="list-disc space-y-2 pl-5 text-sm text-gris">
            <li>
              <strong className="text-tinta">Personas</strong>: aproximado. Si alguien entra desde
              el móvil y desde el ordenador, o en días distintos, cuenta más de una vez.
            </li>
            <li>
              <strong className="text-tinta">De dónde vienen</strong>: «Directo» incluye a quien
              escribió la dirección y también muchos enlaces abiertos desde apps (WhatsApp,
              Instagram…), que no dicen de dónde vienen.
            </li>
            <li>
              Para saber cuánta gente llega desde un enlace vuestro, añádele{" "}
              <code className="rounded bg-niebla px-1">?utm_source=instagram</code> (o el nombre que
              queráis): saldrá con ese nombre aquí. Por ejemplo:{" "}
              <code className="rounded bg-niebla px-1 break-all">
                valentiarobotics.com/?utm_source=instagram
              </code>
            </li>
            <li>No se cuentan los robots de Google ni otros programas automáticos.</li>
          </ul>
        </Caja>
      </div>
    </>
  );
}
