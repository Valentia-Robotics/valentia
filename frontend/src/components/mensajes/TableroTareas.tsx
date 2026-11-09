"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import type { Respuesta } from "@/app/mensajes/acciones";
import { ESTADOS, SEGUNDOS_REFRESCO_CHAT, ordenPrioridad, vencida } from "@/config/mensajes";
import type { TareaEnLista } from "@/lib/mensajes/mensajes";
import { cn } from "@/lib/utils";
import { TarjetaTarea } from "./TarjetaTarea";

/** Orden dentro de cada columna: primero las vencidas, luego por prioridad y por fecha de entrega */
function ordenar(a: TareaEnLista, b: TareaEnLista) {
  const va = vencida(a.entregaEn, a.estadoTarea) ? 0 : 1;
  const vb = vencida(b.entregaEn, b.estadoTarea) ? 0 : 1;
  if (va !== vb) return va - vb;
  const p = ordenPrioridad(a.prioridad) - ordenPrioridad(b.prioridad);
  if (p !== 0) return p;
  const ea = a.entregaEn?.getTime() ?? Infinity;
  const eb = b.entregaEn?.getTime() ?? Infinity;
  if (ea !== eb) return ea - eb;
  return b.creadoEn.getTime() - a.creadoEn.getTime();
}

type Filtro = "para-mi" | "pedidas" | "todas";

const FILTROS: { valor: Filtro; nombre: string }[] = [
  { valor: "para-mi", nombre: "Para mí" },
  { valor: "pedidas", nombre: "Las que he pedido" },
  { valor: "todas", nombre: "Todas" },
];

/**
 * EL TABLERO DE TAREAS (/mensajes/tareas): tres columnas, Por hacer, En curso y Hecha, como en
 * Notion. Cada tarjeta se cambia de columna con sus botones y lleva al chat donde se escribió.
 */
export function TableroTareas({ tareas, miId }: { tareas: TareaEnLista[]; miId: string }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("para-mi");
  const [error, setError] = useState<string | null>(null);
  const [, empezar] = useTransition();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, SEGUNDOS_REFRESCO_CHAT * 3000);
    return () => clearInterval(id);
  }, [router]);

  const accion = (hacer: () => Promise<Respuesta>) =>
    empezar(async () => {
      const respuesta = await hacer();
      setError(respuesta.ok ? null : (respuesta.mensaje ?? "No se ha podido hacer."));
      router.refresh();
    });

  // «Para mí»: las que tengo que hacer yo (o las que escribí sin responsable).
  // «Las que he pedido»: las que escribí yo para otra persona
  const visibles = tareas.filter((t) =>
    filtro === "para-mi"
      ? t.responsableId === miId || (!t.responsableId && t.autorId === miId)
      : filtro === "pedidas"
        ? t.autorId === miId && !!t.responsableId && t.responsableId !== miId
        : true,
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/mensajes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gris hover:text-tinta"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Chats
        </Link>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-medium sm:text-3xl">Tareas</h1>
            <p className="mt-1 text-sm text-gris">
              Las tareas del General y de tus chats. Para crear una, pulsa «Tarea» al escribir un
              mensaje.
            </p>
          </div>
          <div className="inline-flex self-start rounded-lg border border-linea bg-white p-1 text-sm">
            {FILTROS.map((o) => (
              <button
                key={o.valor}
                type="button"
                aria-pressed={filtro === o.valor}
                onClick={() => setFiltro(o.valor)}
                className={cn(
                  "rounded-md px-3 py-1.5",
                  filtro === o.valor ? "bg-tinta text-white" : "text-gris hover:text-tinta",
                )}
              >
                {o.nombre}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-error-oscuro">
            {error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {ESTADOS.map((estado) => {
            const columna = visibles.filter((t) => t.estadoTarea === estado.valor).sort(ordenar);
            return (
              <section
                key={estado.valor}
                aria-label={estado.nombre}
                className="flex flex-col gap-2 rounded-xl bg-white/60 p-3"
              >
                <h2 className="flex items-center gap-2 px-1 text-sm font-medium">
                  <span className={cn("rounded px-1.5 py-0.5", estado.etiqueta)}>
                    {estado.nombre}
                  </span>
                  <span className="text-gris">{columna.length}</span>
                </h2>
                {columna.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-gris">Nada por aquí.</p>
                )}
                {columna.map((t) => (
                  <article key={t.id} className="rounded-lg bg-white p-3 shadow-sm">
                    <TarjetaTarea tarea={t} accion={accion} />
                    <p
                      className={cn(
                        "line-clamp-4 text-sm break-words whitespace-pre-wrap",
                        t.estadoTarea === "HECHA" && "text-gris line-through",
                      )}
                    >
                      {t.texto}
                    </p>
                    <Link
                      href={`/mensajes/${t.ruta}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-gris hover:text-acento"
                    >
                      <MessageCircle aria-hidden="true" className="size-3.5" />
                      {t.chat} · de {t.autorId === miId ? "ti" : t.autorNombre}
                    </Link>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
