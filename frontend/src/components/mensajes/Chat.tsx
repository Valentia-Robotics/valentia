"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { ChevronLeft, ClipboardList, ListTodo, SendHorizontal, Trash2 } from "lucide-react";
import { enviarMensaje, quitarMensaje, type Respuesta } from "@/app/mensajes/acciones";
import { textoConexion } from "@/config/equipo";
import {
  MAX_CARACTERES_MENSAJE,
  SEGUNDOS_REFRESCO_CHAT,
  claveDia,
  horaMensaje,
  textoDia,
  trozosConEnlaces,
} from "@/config/mensajes";
import type { Rol } from "@/generated/prisma/enums";
import type { Mensaje } from "@/lib/mensajes/mensajes";
import { cn } from "@/lib/utils";
import {
  OpcionesTarea,
  opcionesVacias,
  tareaParaEnviar,
  type OpcionesTareaValor,
} from "./OpcionesTarea";
import { Avatar, nombreRol } from "./PantallaMensajes";
import { TarjetaTarea } from "./TarjetaTarea";

interface Props {
  ruta: string;
  titulo: string;
  foto: string | null;
  rol: Rol | null;
  ultimaConexionEn: Date | null;
  miId: string;
  soyAdmin: boolean;
  puedeEscribir: boolean;
  mensajes: Mensaje[];
  /** Quién puede ver el chat (para elegir el responsable de una tarea) */
  personas: { id: string; nombre: string }[];
}

/** UN CHAT ABIERTO, como en WhatsApp: burbujas, separadores de día y el cuadro para escribir */
export function Chat(props: Props) {
  const { ruta, titulo, foto, rol, ultimaConexionEn, miId, soyAdmin, puedeEscribir, personas } =
    props;
  const general = ruta === "general";
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [esTarea, setEsTarea] = useState(false);
  // En un privado, la tarea es para la otra persona salvo que se cambie
  const responsablePorDefecto = ruta === "general" ? "" : ruta;
  const [opciones, setOpciones] = useState<OpcionesTareaValor>(() =>
    opcionesVacias(responsablePorDefecto),
  );
  const [error, setError] = useState<string | null>(null);
  const [, empezar] = useTransition();
  // El mensaje sale al momento (en gris claro) mientras se guarda
  const [mensajes, anadirPendiente] = useOptimistic(props.mensajes, (lista, nuevo: Mensaje) => [
    ...lista,
    nuevo,
  ]);
  const caja = useRef<HTMLDivElement>(null);
  const areaTexto = useRef<HTMLTextAreaElement>(null);
  const pegadoAbajo = useRef(true);

  // Mensajes nuevos: se mira cada pocos segundos mientras la pestaña esté a la vista
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, SEGUNDOS_REFRESCO_CHAT * 1000);
    return () => clearInterval(id);
  }, [router]);

  // Bajar al último mensaje al abrir y cuando llega uno (si ya estabas abajo del todo)
  useEffect(() => {
    const el = caja.current;
    if (el && pegadoAbajo.current) el.scrollTop = el.scrollHeight;
  }, [mensajes.length]);

  const alDesplazar = () => {
    const el = caja.current;
    if (el) pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const enviar = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    const tarea = esTarea ? opciones : null;
    setError(null);
    setTexto("");
    setEsTarea(false);
    setOpciones(opcionesVacias(responsablePorDefecto));
    pegadoAbajo.current = true;
    empezar(async () => {
      const responsable = personas.find((p) => p.id === tarea?.responsableId);
      anadirPendiente({
        id: `pendiente-${Date.now()}`,
        autorId: miId,
        autorNombre: "",
        texto: limpio,
        creadoEn: new Date(),
        esTarea: !!tarea,
        estadoTarea: "PENDIENTE",
        prioridad: null,
        entregaEn: null,
        responsableId: responsable?.id ?? null,
        responsableNombre: responsable?.nombre ?? null,
        recordarEn: null,
        hechaEn: null,
        hechaPor: null,
      });
      const respuesta = await enviarMensaje(ruta, limpio, tarea && tareaParaEnviar(tarea));
      if (!respuesta.ok) {
        // Lo escrito vuelve al cuadro para corregirlo
        setError(respuesta.mensaje ?? "No se ha podido enviar.");
        setTexto(limpio);
        if (tarea) {
          setEsTarea(true);
          setOpciones(tarea);
        }
      }
      router.refresh();
    });
    areaTexto.current?.focus();
  };

  // Intro envía; Mayús + Intro hace otra línea. En el móvil, Intro siempre hace otra línea
  const alPulsarTecla = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key !== "Enter" || evento.shiftKey || evento.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    evento.preventDefault();
    enviar();
  };

  const accion = (hacer: () => Promise<Respuesta>) =>
    empezar(async () => {
      const respuesta = await hacer();
      if (!respuesta.ok) setError(respuesta.mensaje ?? "No se ha podido hacer.");
      router.refresh();
    });

  return (
    <>
      <header className="flex items-center gap-3 border-b border-linea bg-white px-3 py-2.5 sm:px-4">
        <Link
          href="/mensajes"
          aria-label="Volver a los chats"
          className="inline-flex size-9 items-center justify-center rounded-md text-gris hover:bg-niebla hover:text-tinta md:hidden"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>
        <Avatar nombre={titulo} foto={foto} general={general} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium">{titulo}</h2>
          <p className="truncate text-xs text-gris">
            {general
              ? "Todo el equipo: administración, editores y hardware"
              : `${nombreRol(rol)} · ${textoConexion(ultimaConexionEn)}`}
          </p>
        </div>
        <Link
          href="/mensajes/tareas"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gris hover:bg-niebla hover:text-tinta"
        >
          <ListTodo aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Tareas</span>
        </Link>
      </header>

      <div
        ref={caja}
        onScroll={alDesplazar}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
        aria-live="polite"
      >
        {mensajes.length === 0 && (
          <p className="mx-auto mt-10 max-w-xs rounded-lg bg-white px-4 py-3 text-center text-sm text-gris shadow-sm">
            {general
              ? "Todavía no hay mensajes. Escribe el primero para todo el equipo."
              : `Todavía no habéis hablado. Lo que escribas aquí solo lo verá ${titulo}.`}
          </p>
        )}
        <ol className="mx-auto flex max-w-3xl flex-col gap-1.5">
          {mensajes.map((m, i) => {
            const mio = m.autorId === miId;
            const anterior = mensajes[i - 1];
            const diaNuevo = !anterior || claveDia(anterior.creadoEn) !== claveDia(m.creadoEn);
            const mismoAutor = !diaNuevo && anterior?.autorId === m.autorId;
            const pendiente = m.id.startsWith("pendiente-");
            const puedeBorrar = !pendiente && (mio || (general && soyAdmin));
            return (
              <Fragment key={m.id}>
                {diaNuevo && (
                  <li className="my-2 self-center rounded-md bg-white px-3 py-1 text-xs text-gris shadow-sm">
                    {textoDia(m.creadoEn)}
                  </li>
                )}
                <li
                  className={cn(
                    "group flex max-w-[85%] flex-col sm:max-w-[70%]",
                    mio ? "items-end self-end" : "items-start self-start",
                    !mismoAutor && "mt-1.5",
                  )}
                >
                  <div
                    className={cn(
                      "relative rounded-2xl px-3 py-2 text-[15px] shadow-sm",
                      mio ? "rounded-br-md bg-[#E3E8FF]" : "rounded-bl-md bg-white",
                      pendiente && "opacity-60",
                      m.esTarea && "min-w-64 border-l-4",
                      m.esTarea &&
                        (m.prioridad === "ALTA"
                          ? "border-error"
                          : m.prioridad === "MEDIA"
                            ? "border-[#E8B100]"
                            : m.prioridad === "BAJA"
                              ? "border-exito"
                              : "border-tinta/30"),
                    )}
                  >
                    {general && !mio && !mismoAutor && (
                      <p className="mb-0.5 text-xs font-semibold text-acento">{m.autorNombre}</p>
                    )}
                    {m.esTarea && !pendiente && <TarjetaTarea tarea={m} accion={accion} />}
                    <p
                      className={cn(
                        "break-words whitespace-pre-wrap",
                        m.esTarea &&
                          m.estadoTarea === "HECHA" &&
                          "text-gris line-through decoration-gris/60",
                      )}
                    >
                      {trozosConEnlaces(m.texto).map((t, j) =>
                        t.enlace ? (
                          <a
                            key={j}
                            href={t.enlace}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="break-all text-acento underline"
                          >
                            {t.texto}
                          </a>
                        ) : (
                          <Fragment key={j}>{t.texto}</Fragment>
                        ),
                      )}
                    </p>
                    <p className="mt-0.5 text-right text-[11px] text-gris">
                      {pendiente ? "Enviando…" : horaMensaje(m.creadoEn)}
                    </p>
                  </div>

                  {puedeBorrar && (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      {puedeBorrar && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("¿Borrar este mensaje? Desaparece para todos.")) {
                              accion(() => quitarMensaje(m.id));
                            }
                          }}
                          aria-label="Borrar mensaje"
                          className="inline-flex size-6 items-center justify-center rounded text-gris opacity-100 hover:bg-white hover:text-error sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>

      {puedeEscribir ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
          className="border-t border-linea bg-white px-3 py-2.5 sm:px-4"
        >
          {error && (
            <p role="alert" className="mx-auto mb-2 max-w-3xl text-sm text-error-oscuro">
              {error}
            </p>
          )}
          {esTarea && <OpcionesTarea valor={opciones} cambiar={setOpciones} personas={personas} />}
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <button
              type="button"
              onClick={() => setEsTarea((v) => !v)}
              aria-pressed={esTarea}
              aria-label="Tarea"
              title="Marca el mensaje como tarea: se podrá poner «hecha»"
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                esTarea
                  ? "border-aviso bg-aviso/10 font-medium text-aviso-oscuro"
                  : "border-linea text-gris hover:border-tinta hover:text-tinta",
              )}
            >
              <ClipboardList aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Tarea</span>
            </button>
            <label className="sr-only" htmlFor="texto-mensaje">
              Mensaje
            </label>
            <textarea
              id="texto-mensaje"
              ref={areaTexto}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={alPulsarTecla}
              rows={1}
              maxLength={MAX_CARACTERES_MENSAJE}
              placeholder={esTarea ? "Escribe la tarea…" : "Escribe un mensaje"}
              className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-linea bg-niebla px-4 py-2.5 text-[15px] outline-none focus:border-acento focus:bg-white"
            />
            <button
              type="submit"
              disabled={!texto.trim()}
              aria-label="Enviar"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-acento text-white transition-colors hover:bg-acento-hover disabled:opacity-40"
            >
              <SendHorizontal aria-hidden="true" className="size-5" />
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-linea bg-white px-4 py-3 text-center text-sm text-gris">
          {titulo} ya no está en el equipo: puedes leer el chat, pero no escribir.
        </p>
      )}
    </>
  );
}
