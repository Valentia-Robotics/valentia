import { Contenedor } from "@/components/ui/Contenedor";
import type { ResumenResenas } from "@/lib/resenas";
import { formatearMedia } from "@/lib/resenas/formato";
import { plural } from "@/lib/utils";
import { Estrellas } from "./Estrellas";
import { FormularioResena } from "./FormularioResena";

const formatoFecha = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

/** OPINIONES de la ficha de kit: media, lista de reseñas publicadas y formulario para opinar */
export function SeccionResenas({ slug, resumen }: { slug: string; resumen: ResumenResenas }) {
  return (
    <section
      id="opiniones"
      aria-labelledby="titulo-opiniones"
      className="scroll-mt-nav py-20 sm:py-28"
    >
      <Contenedor className="max-w-3xl">
        <h2 id="titulo-opiniones" className="text-3xl font-medium sm:text-5xl">
          Opiniones.
        </h2>
        {resumen.total > 0 ? (
          <p className="mt-4 flex flex-wrap items-center gap-3 text-lg">
            <Estrellas nota={resumen.media} className="text-2xl" />
            <span className="font-medium">{formatearMedia(resumen.media)} de 5</span>
            <span className="text-gris">· {plural(resumen.total, "opinión", "opiniones")}</span>
          </p>
        ) : (
          <p className="mt-4 text-lg text-gris">Todavía nadie ha opinado sobre este kit.</p>
        )}

        {resumen.resenas.length > 0 && (
          <ul className="mt-10 divide-y divide-linea">
            {resumen.resenas.map((r) => (
              <li key={r.id} className="py-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Estrellas nota={r.estrellas} />
                  <span className="font-medium">{r.autor}</span>
                  <span className="text-sm text-gris">{formatoFecha.format(r.fecha)}</span>
                </div>
                <p className="mt-2 leading-relaxed whitespace-pre-line text-tinta/80">{r.texto}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 rounded-tarjeta bg-niebla p-6 sm:p-8">
          <h3 className="mb-4 text-xl font-medium">Deja tu opinión</h3>
          <FormularioResena slug={slug} />
        </div>
      </Contenedor>
    </section>
  );
}
