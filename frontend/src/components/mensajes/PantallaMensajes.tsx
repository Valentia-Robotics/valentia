import Link from "next/link";
import type { ReactNode } from "react";
import { MessagesSquare, Users } from "lucide-react";
import { ROLES_EQUIPO, enLinea } from "@/config/equipo";
import { cuandoEnLista } from "@/config/mensajes";
import type { Conversacion } from "@/lib/mensajes/mensajes";
import { cn } from "@/lib/utils";

/** Iniciales para el circulito de cada persona: «Dani Pérez» → «DP» */
export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const nombreRol = (rol: string | null) =>
  ROLES_EQUIPO.find((r) => r.rol === rol)?.nombre ?? "Ya no está en el equipo";

/** El circulito con las iniciales (o el icono del grupo para el General) */
export function Avatar({
  nombre,
  general,
  conectado,
}: {
  nombre: string;
  general?: boolean;
  conectado?: boolean;
}) {
  return (
    <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-tinta text-sm font-medium text-white">
      {general ? <Users aria-hidden="true" className="size-5" /> : iniciales(nombre)}
      {conectado && (
        <span
          title="Conectado ahora"
          className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white bg-exito"
        />
      )}
    </span>
  );
}

/**
 * LA PANTALLA DE MENSAJES, como WhatsApp en el ordenador: la lista de chats a la izquierda y el
 * chat abierto a la derecha. En el móvil se ve una cosa u otra (la lista, o el chat con «‹ Chats»).
 */
export function PantallaMensajes({
  conversaciones,
  activa,
  children,
}: {
  conversaciones: Conversacion[];
  activa?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <section
        aria-label="Chats"
        className={cn(
          "min-h-0 w-full flex-col border-linea bg-white md:flex md:w-80 md:shrink-0 md:border-r",
          activa ? "hidden" : "flex",
        )}
      >
        <header className="border-b border-linea px-4 py-4">
          <h1 className="text-xl font-medium">Mensajes</h1>
          <p className="text-xs text-gris">
            Solo los ve el equipo. Los privados, solo sus dos personas.
          </p>
        </header>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {conversaciones.map((c) => {
            const general = c.ruta === "general";
            const ultimo = c.ultimo
              ? `${c.ultimo.mio ? "Tú: " : general ? `${c.ultimo.autorNombre}: ` : ""}${c.ultimo.texto}`
              : general
                ? "El chat de todo el equipo"
                : nombreRol(c.rol);
            return (
              <li key={c.ruta}>
                <Link
                  href={`/mensajes/${c.ruta}`}
                  aria-current={activa === c.ruta ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 border-b border-linea/60 px-4 py-3 transition-colors",
                    activa === c.ruta ? "bg-niebla" : "hover:bg-niebla/60",
                  )}
                >
                  <Avatar
                    nombre={c.nombre}
                    general={general}
                    conectado={!general && enLinea(c.ultimaConexionEn)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{c.nombre}</span>
                      {c.ultimo && (
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            c.noLeidos > 0 ? "font-medium text-acento" : "text-gris",
                          )}
                        >
                          {cuandoEnLista(c.ultimo.creadoEn)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-gris">{ultimo}</span>
                      {c.noLeidos > 0 && (
                        <span
                          aria-label={`${c.noLeidos} sin leer`}
                          className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-acento px-1.5 text-xs font-semibold text-white"
                        >
                          {c.noLeidos > 99 ? "99+" : c.noLeidos}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          {conversaciones.length === 1 && (
            <li className="px-4 py-6 text-sm text-gris">
              Cuando haya más personas en el equipo, sus chats privados saldrán aquí.
            </li>
          )}
        </ul>
      </section>

      <div className={cn("min-h-0 min-w-0 flex-1 flex-col", activa ? "flex" : "hidden md:flex")}>
        {children ?? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-gris">
            <MessagesSquare aria-hidden="true" className="size-10" strokeWidth={1.5} />
            <p className="max-w-xs text-sm">
              Elige un chat de la lista: el General para todo el equipo, o el de una persona para
              hablar solo con ella.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
