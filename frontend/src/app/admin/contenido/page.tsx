import type { Metadata } from "next";
import Link from "next/link";
import {
  AccionesLoteGuiones,
  FORMULARIO_LOTE_GUIONES,
} from "@/components/admin/AccionesLoteGuiones";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { Insignia } from "@/components/admin/Insignia";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { SelectorAdmin } from "@/components/admin/campos";
import { Tabla } from "@/components/admin/Tabla";
import { InsigniaAutomatico } from "@/components/contenido/DatosAutomaticos";
import { InsigniaEstadoGuion } from "@/components/contenido/TextoGuion";
import { estadosGuion, ORDEN_ESTADOS } from "@/config/estadosGuion";
import type { EstadoGuion } from "@/generated/prisma/enums";
import { fecha } from "@/lib/admin/formato";
import {
  buscarGuiones,
  categoriasGuion,
  ESTADOS_DESCARTABLES,
  editores as listaEditores,
} from "@/lib/contenido/guiones";
import { esId } from "@/lib/ids";
import { exigirAdmin } from "@/lib/sesion";
import { cn, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Contenido" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const leer = (valor: string | string[] | undefined) => (typeof valor === "string" ? valor : "");

/** CONTENIDO: guiones en lista o en tablero. Filtros en la dirección: ?estado=…&categoria=…&editor=… */
export default async function ContenidoAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/contenido");
  const parametros = await searchParams;
  const estado = leer(parametros.estado);
  const categoria = leer(parametros.categoria);
  const editor = leer(parametros.editor);
  const tablero = leer(parametros.vista) === "tablero";
  // «Automáticos pendientes»: los que ha mandado n8n y esperan tu revisión
  const automaticos = leer(parametros.mostrar) === "automaticos";
  const descartado = leer(parametros.descartado) === "1";

  const [guiones, categorias, editores] = await Promise.all([
    buscarGuiones({
      ...(Object.hasOwn(estadosGuion, estado) ? { estado: estado as EstadoGuion } : {}),
      ...(esId(categoria) ? { categoriaId: categoria } : {}),
      ...(esId(editor) ? { editorId: editor } : {}),
      ...(automaticos ? { origen: "IA" as const, estado: "PENDIENTE_APROBACION" as const } : {}),
    }),
    categoriasGuion(),
    listaEditores(),
  ]);

  // Con casilla: los que se pueden aprobar o descartar desde la barra de arriba
  const seleccionable = (g: (typeof guiones)[number]) =>
    g.estado === "PENDIENTE_APROBACION" ||
    (g.origen === "IA" && !g.editor && ESTADOS_DESCARTABLES.includes(g.estado));
  const conCasillas = guiones.some(seleccionable);

  const enlaceVista = (vista: string) => {
    const filtros = new URLSearchParams({
      estado,
      categoria,
      editor,
      mostrar: automaticos ? "automaticos" : "",
      vista,
    });
    return `/admin/contenido?${filtros}`;
  };

  return (
    <>
      <Cabecera
        titulo="Contenido"
        descripcion={plural(guiones.length, "guion", "guiones")}
        acciones={
          <div className="flex flex-wrap gap-2">
            <BotonAdmin href="/admin/contenido/llamadas" variante="secundario">
              Llamadas de n8n
            </BotonAdmin>
            <BotonAdmin href="/admin/contenido/metricas" variante="secundario">
              Métricas
            </BotonAdmin>
            <BotonAdmin href="/admin/contenido/categorias" variante="secundario">
              Categorías
            </BotonAdmin>
            <BotonAdmin href="/admin/contenido/nuevo">Nuevo guion</BotonAdmin>
          </div>
        }
      />

      {descartado && (
        <p role="status" className="mb-4 rounded-lg bg-white p-3 text-sm ring-1 ring-linea">
          Guion descartado. No se ha borrado: lo encuentras con Estado «Descartado» y puedes
          recuperarlo.
        </p>
      )}

      <form className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
        {tablero && <input type="hidden" name="vista" value="tablero" />}
        <SelectorAdmin
          etiqueta="Mostrar"
          name="mostrar"
          defaultValue={automaticos ? "automaticos" : ""}
          opciones={[
            { valor: "", texto: "Todos los guiones" },
            { valor: "automaticos", texto: "🤖 Automáticos pendientes" },
          ]}
        />
        <SelectorAdmin
          etiqueta="Estado"
          name="estado"
          defaultValue={estado}
          opciones={[
            { valor: "", texto: "Todos" },
            ...ORDEN_ESTADOS.map((e) => ({ valor: e, texto: estadosGuion[e].nombre })),
            { valor: "DESCARTADO", texto: "Descartados" },
          ]}
        />
        <SelectorAdmin
          etiqueta="Categoría"
          name="categoria"
          defaultValue={categoria}
          opciones={[
            { valor: "", texto: "Todas" },
            ...categorias.map((c) => ({ valor: c.id, texto: c.nombre })),
          ]}
        />
        <SelectorAdmin
          etiqueta="Editor"
          name="editor"
          defaultValue={editor}
          opciones={[
            { valor: "", texto: "Todos" },
            ...editores.map((e) => ({ valor: e.id, texto: e.nombre })),
          ]}
        />
        <BotonAdmin type="submit" variante="secundario">
          Filtrar
        </BotonAdmin>
      </form>

      <nav aria-label="Forma de ver los guiones" className="mb-4 flex gap-1 text-sm">
        {[
          { vista: "lista", texto: "Lista", activa: !tablero },
          { vista: "tablero", texto: "Tablero", activa: tablero },
        ].map((v) => (
          <Link
            key={v.vista}
            href={enlaceVista(v.vista)}
            aria-current={v.activa ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5",
              v.activa ? "bg-tinta text-white" : "text-tinta/80 hover:bg-white",
            )}
          >
            {v.texto}
          </Link>
        ))}
      </nav>

      {tablero ? (
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          tabIndex={0}
          role="region"
          aria-label="Tablero"
        >
          {ORDEN_ESTADOS.map((columna) => {
            const delEstado = guiones.filter((g) => g.estado === columna);
            return (
              <section
                key={columna}
                className="w-60 shrink-0 rounded-lg bg-white p-3 ring-1 ring-linea"
              >
                <h2 className="font-sans text-xs font-semibold text-gris">
                  {estadosGuion[columna].nombre} ({delEstado.length})
                </h2>
                <ul className="mt-2 space-y-2">
                  {delEstado.map((g) => (
                    <li key={g.id}>
                      <Link
                        href={`/admin/contenido/${g.id}`}
                        className="block rounded-md bg-niebla p-2.5 text-sm hover:ring-1 hover:ring-tinta/30"
                      >
                        <span className="block font-medium">
                          {g.titulo} <EtiquetaOrigen guion={g} />
                        </span>
                        <span className="mt-1 block text-xs text-gris">
                          {g.categoria.nombre} · {fecha(g.fechaLimite)}
                        </span>
                        {g.editor && (
                          <span className="block text-xs text-gris">{g.editor.nombre}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <>
          {conCasillas && <AccionesLoteGuiones />}
          <Caja sinRelleno>
            <Tabla
              columnas={[
                ...(conCasillas ? [""] : []),
                "Guion",
                "Categoría",
                "Estado",
                "Editor",
                "Fecha límite",
              ]}
              vacia={guiones.length === 0 && "No hay ningún guion con estos filtros."}
            >
              {guiones.map((g) => (
                <tr key={g.id}>
                  {conCasillas && (
                    <td className="w-0">
                      {seleccionable(g) && (
                        <input
                          type="checkbox"
                          name="ids"
                          value={g.id}
                          form={FORMULARIO_LOTE_GUIONES}
                          aria-label={`Seleccionar el guion «${g.titulo}»`}
                          className="size-4 accent-acento"
                        />
                      )}
                    </td>
                  )}
                  <td>
                    <Link
                      href={`/admin/contenido/${g.id}`}
                      className="font-medium hover:text-acento"
                    >
                      {g.titulo}
                    </Link>{" "}
                    <EtiquetaOrigen guion={g} />
                  </td>
                  <td className="text-gris">{g.categoria.nombre}</td>
                  <td>
                    <InsigniaEstadoGuion estado={g.estado} />
                  </td>
                  <td className="text-gris">{g.editor?.nombre ?? "—"}</td>
                  <td className="whitespace-nowrap text-gris">{fecha(g.fechaLimite)}</td>
                </tr>
              ))}
            </Tabla>
          </Caja>
        </>
      )}
    </>
  );
}

/** 🤖 Automático (n8n) con su relevancia y medio; «IA» si es otro guion generado con IA */
function EtiquetaOrigen({
  guion,
}: {
  guion: {
    origen: string;
    automatico: { relevancia: number | null; fuente: { medio: string | null } } | null;
  };
}) {
  if (guion.automatico) {
    return (
      <InsigniaAutomatico
        relevancia={guion.automatico.relevancia}
        medio={guion.automatico.fuente.medio}
      />
    );
  }
  return guion.origen === "IA" ? <Insignia tono="acento">IA</Insignia> : null;
}
