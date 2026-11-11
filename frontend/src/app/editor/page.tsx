import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, Clapperboard, Lightbulb, PlayCircle } from "lucide-react";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { Buscador } from "@/components/admin/Buscador";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { TarjetaDato } from "@/components/admin/TarjetaDato";
import { InsigniaEstadoGuion } from "@/components/contenido/TextoGuion";
import {
  ESTADOS_DE_TRABAJO,
  PASOS_EDICION,
  plataformasGuion,
  urgenciaGuion,
} from "@/config/estadosGuion";
import type { EstadoGuion } from "@/generated/prisma/enums";
import { fecha } from "@/lib/admin/formato";
import { guionesDelEditor } from "@/lib/contenido/guiones";
import { exigirEditor } from "@/lib/sesion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mis guiones" };

type Guion = Awaited<ReturnType<typeof guionesDelEditor>>[number];

/** Una idea propia que aún nadie le ha asignado (si se la asignan, pasa a ser un guion más) */
const esIdea = (g: Guion) => g.origen === "EDITOR" && !g.editorId;

/** Las pestañas de la lista: qué guiones enseña cada una */
const VISTAS: { id: string; nombre: string; incluye: (g: Guion) => boolean }[] = [
  {
    id: "activos",
    nombre: "Activos",
    incluye: (g) => g.estado !== "COMPLETADO" && g.estado !== "DESCARTADO",
  },
  { id: "por-hacer", nombre: "Por hacer", incluye: (g) => ESTADOS_DE_TRABAJO.includes(g.estado) },
  { id: "ideas", nombre: "Mis ideas", incluye: (g) => esIdea(g) && g.estado !== "DESCARTADO" },
  {
    id: "terminados",
    nombre: "Terminados",
    incluye: (g) => g.estado === "ENTREGADO" || g.estado === "COMPLETADO",
  },
  { id: "archivados", nombre: "Archivados", incluye: (g) => g.estado === "DESCARTADO" },
];

/** Para ordenar: primero lo que hay que hacer, luego las ideas, luego lo entregado */
const PESO: Record<EstadoGuion, number> = {
  EN_PROGRESO: 0,
  ASIGNADO: 1,
  BORRADOR: 2,
  PENDIENTE_APROBACION: 3,
  APROBADO: 4,
  ENTREGADO: 5,
  COMPLETADO: 6,
  DESCARTADO: 7,
};

interface Props {
  searchParams: Promise<{ ver?: string; q?: string }>;
}

/**
 * MIS GUIONES: el espacio de trabajo del editor. Los guiones que tiene asignados y sus ideas
 * propias, con pestañas, buscador, lo que vence pronto y cuánto lleva hecho de cada uno.
 */
export default async function MisGuiones({ searchParams }: Props) {
  const editor = await exigirEditor("/editor");
  const { ver, q = "" } = await searchParams;
  const vista = VISTAS.find((v) => v.id === ver) ?? VISTAS[0];
  const todos = await guionesDelEditor(editor.id);
  const ahora = new Date();

  const busqueda = q.trim().toLocaleLowerCase("es");
  const guiones = todos
    .filter(vista.incluye)
    .filter(
      (g) =>
        !busqueda ||
        g.titulo.toLocaleLowerCase("es").includes(busqueda) ||
        g.categoria.nombre.toLocaleLowerCase("es").includes(busqueda),
    )
    .sort(
      (a, b) =>
        PESO[a.estado] - PESO[b.estado] || a.fechaLimite.getTime() - b.fechaLimite.getTime(),
    );

  // Cifras de arriba
  const porEmpezar = todos.filter((g) => g.estado === "ASIGNADO").length;
  const enProgreso = todos.filter((g) => g.estado === "EN_PROGRESO").length;
  const urgentes = todos.filter((g) => {
    if (!ESTADOS_DE_TRABAJO.includes(g.estado)) return false;
    const u = urgenciaGuion(g.fechaLimite, g.estado, ahora);
    return u?.tono === "error" || u?.tono === "aviso";
  }).length;
  const ideas = todos.filter((g) => esIdea(g) && g.estado !== "DESCARTADO").length;

  const enlaceVista = (id: string) => {
    const parametros = new URLSearchParams();
    if (id !== VISTAS[0].id) parametros.set("ver", id);
    if (q) parametros.set("q", q);
    const cadena = parametros.toString();
    return cadena ? `/editor?${cadena}` : "/editor";
  };

  return (
    <>
      <Cabecera
        titulo="Mis guiones"
        descripcion="Lo que tienes asignado y tus propias ideas, todo en un sitio."
        acciones={<BotonAdmin href="/editor/nuevo">Nueva idea de guion</BotonAdmin>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDato
          titulo="Por empezar"
          valor={porEmpezar}
          icono={Clapperboard}
          href="/editor?ver=por-hacer"
        />
        <TarjetaDato
          titulo="En progreso"
          valor={enProgreso}
          icono={PlayCircle}
          href="/editor?ver=por-hacer"
        />
        <TarjetaDato
          titulo="Vencen en 7 días o antes"
          valor={urgentes}
          detalle={urgentes ? "Incluye los retrasados" : "Vas bien de tiempo"}
          icono={AlarmClock}
          href="/editor?ver=por-hacer"
        />
        <TarjetaDato
          titulo="Mis ideas"
          valor={ideas}
          detalle="Borradores y enviadas a revisión"
          icono={Lightbulb}
          href="/editor?ver=ideas"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav
          aria-label="Qué guiones ver"
          className="-mx-1 sin-barra flex gap-1 overflow-x-auto px-1"
        >
          {VISTAS.map((v) => {
            const cuantos = todos.filter(v.incluye).length;
            const activa = v.id === vista.id;
            return (
              <Link
                key={v.id}
                href={enlaceVista(v.id)}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                  activa ? "bg-tinta text-white" : "bg-white ring-1 ring-linea hover:bg-niebla",
                )}
              >
                {v.nombre} <span className="tabular-nums opacity-70">{cuantos}</span>
              </Link>
            );
          })}
        </nav>
        <Buscador
          valor={q}
          placeholder="Buscar por título o categoría"
          etiqueta="Buscar en mis guiones"
          extra={{ ver: vista.id === VISTAS[0].id ? undefined : vista.id }}
        />
      </div>

      <Caja sinRelleno>
        <Tabla
          columnas={["Guion", "Estado", "Fecha límite", "Avance"]}
          vacia={
            guiones.length === 0 &&
            (busqueda
              ? `Nada coincide con «${q}».`
              : vista.id === "ideas"
                ? "Todavía no has escrito ninguna idea. Pulsa «Nueva idea de guion» para empezar."
                : "Aquí no hay nada ahora mismo.")
          }
        >
          {guiones.map((g) => {
            const urgencia = urgenciaGuion(g.fechaLimite, g.estado, ahora);
            const pasos = PASOS_EDICION.filter((p) => g.pasosHechos.includes(p.id)).length;
            return (
              <tr key={g.id}>
                <td>
                  <Link href={`/editor/${g.id}`} className="font-medium hover:text-acento">
                    {g.titulo}
                  </Link>
                  <p className="mt-0.5 text-xs text-gris">
                    {g.categoria.nombre} · {g.plataformaOtra ?? plataformasGuion[g.plataforma]} ·{" "}
                    {g.duracionObjetivo}
                  </p>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {esIdea(g) && <Insignia tono="acento">Idea tuya</Insignia>}
                    <InsigniaEstadoGuion estado={g.estado} />
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  <p className="text-gris">{fecha(g.fechaLimite)}</p>
                  {urgencia && (
                    <p className="mt-0.5">
                      <Insignia tono={urgencia.tono}>{urgencia.texto}</Insignia>
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap text-gris tabular-nums">
                  {esIdea(g) ? "—" : `${pasos}/${PASOS_EDICION.length} pasos`}
                </td>
              </tr>
            );
          })}
        </Tabla>
      </Caja>
    </>
  );
}
