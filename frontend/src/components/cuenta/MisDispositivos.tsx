"use client";

import { LogOut, Monitor, Smartphone, Tablet, Trash2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState, useTransition } from "react";
import {
  cerrarSesionEnTodos,
  eliminarDispositivo,
  type EstadoDispositivo,
} from "@/app/(cuenta)/cuenta/acciones";
import { Boton } from "@/components/ui/Boton";
import { Dialogo } from "@/components/ui/Dialogo";
import { cn } from "@/lib/utils";
import { Aviso } from "./Aviso";

export interface DispositivoVista {
  id: string;
  nombre: string;
  /** Textos ya preparados en el servidor ("hace 2 horas", "15 de octubre de 2026"…) */
  ultimoUso: string;
  desde: string;
  hasta: string;
  esEste: boolean;
}

/** Icono según el tipo de dispositivo */
function icono(nombre: string) {
  if (/iPad/.test(nombre)) return Tablet;
  if (/iPhone|Android/.test(nombre)) return Smartphone;
  return Monitor;
}

/**
 * "Mis dispositivos": lista de los navegadores de confianza, con botón para eliminar cada uno
 * y otro para cerrar la sesión en todos.
 */
export function MisDispositivos({ dispositivos }: { dispositivos: DispositivoVista[] }) {
  const [pendiente, empezar] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Qué se está confirmando: un dispositivo concreto o "todos"
  const [confirmando, setConfirmando] = useState<DispositivoVista | "todos" | null>(null);

  /** Ejecuta la acción; si ha cerrado ESTA sesión, salimos al login */
  function ejecutar(accion: () => Promise<EstadoDispositivo>) {
    empezar(async () => {
      setMensaje(null);
      const resultado = await accion();
      if (resultado.sesionCerrada) {
        await signOut({ redirectTo: "/login" });
        return;
      }
      if (!resultado.ok) setMensaje(resultado.mensaje ?? "Algo ha fallado.");
      setConfirmando(null);
    });
  }

  const dispositivo = confirmando !== "todos" ? confirmando : null;

  return (
    <div>
      {mensaje && (
        <div className="mb-4">
          <Aviso>{mensaje}</Aviso>
        </div>
      )}

      {dispositivos.length === 0 ? (
        <p className="text-gris">No tienes ningún dispositivo de confianza.</p>
      ) : (
        <ul className="divide-y divide-linea rounded-tarjeta bg-white ring-1 ring-linea">
          {dispositivos.map((d) => {
            const Icono = icono(d.nombre);
            return (
              <li key={d.id} className="flex items-start gap-4 p-4 sm:p-5">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full",
                    d.esEste ? "bg-acento/10 text-acento" : "bg-niebla text-tinta",
                  )}
                >
                  <Icono aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {d.nombre}
                    {d.esEste && (
                      <span className="ml-2 inline-block rounded-boton bg-acento/10 px-2 py-0.5 align-middle text-xs font-medium text-acento">
                        Este dispositivo
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-gris">
                    {d.esEste ? "Lo estás usando ahora" : `Último uso ${d.ultimoUso}`}
                  </p>
                  <p className="text-sm text-gris">
                    De confianza desde el {d.desde} hasta el {d.hasta}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmando(d)}
                  disabled={pendiente}
                  aria-label={`Eliminar ${d.nombre}${d.esEste ? " (este dispositivo)" : ""}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-gris transition-colors hover:bg-error/8 hover:text-error"
                >
                  <Trash2 aria-hidden="true" className="size-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Boton
        variante="secundario"
        onClick={() => setConfirmando("todos")}
        disabled={pendiente}
        className="mt-6"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Cerrar sesión en todos
      </Boton>

      <Dialogo
        abierto={confirmando !== null}
        alCerrar={() => setConfirmando(null)}
        titulo={dispositivo ? `¿Eliminar ${dispositivo.nombre}?` : "¿Cerrar sesión en todos?"}
        className="max-w-md"
      >
        <div className="p-5">
          <p className="text-gris">
            {dispositivo
              ? dispositivo.esEste
                ? "Es el dispositivo que estás usando: se cerrará tu sesión aquí y la próxima vez te pediremos un código."
                : "Se cerrará la sesión en ese dispositivo. Si vuelve a entrar, le pediremos un código enviado a tu email."
              : "Se cerrará la sesión en todos tus dispositivos, también en este. Para volver a entrar te pediremos un código enviado a tu email."}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Boton variante="secundario" onClick={() => setConfirmando(null)} disabled={pendiente}>
              Cancelar
            </Boton>
            <Boton
              variante="peligro"
              disabled={pendiente}
              onClick={() =>
                ejecutar(() =>
                  dispositivo ? eliminarDispositivo(dispositivo.id) : cerrarSesionEnTodos(),
                )
              }
            >
              {pendiente ? "Un momento…" : dispositivo ? "Sí, eliminar" : "Sí, cerrar en todos"}
            </Boton>
          </div>
        </div>
      </Dialogo>
    </div>
  );
}
