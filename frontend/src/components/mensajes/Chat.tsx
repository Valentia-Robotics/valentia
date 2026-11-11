"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowDown,
  ChevronLeft,
  ClipboardList,
  ImagePlus,
  ListTodo,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { enviarMensaje, quitarMensaje, type Respuesta } from "@/app/mensajes/acciones";
import { ROLES_EQUIPO, textoConexion } from "@/config/equipo";
import {
  MAX_CARACTERES_MENSAJE,
  SEGUNDOS_REFRESCO_CHAT,
  TIPOS_IMAGEN_MENSAJE,
  claveDia,
  horaMensaje,
  problemaImagen,
  tamanoEnChat,
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
import { SelectorEmojis } from "./SelectorEmojis";
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
  /** La huella del chat cuando se cargó: si el servidor da otra, hay algo nuevo */
  huella: string | null;
  /** Quién puede ver el chat (para elegir el responsable de una tarea) */
  personas: { id: string; nombre: string }[];
}

/** Un mensaje en pantalla: el que se está enviando lleva la imagen elegida para verla ya */
type MensajeChat = Mensaje & { vistaPrevia?: string };

/** «Todo el equipo: administración, editores y hardware» (sale solo con cada rol nuevo) */
const TODO_EL_EQUIPO = (() => {
  const nombres = ROLES_EQUIPO.map((r) => r.plural.toLowerCase());
  const ultimo = nombres.pop();
  return `Todo el equipo: ${nombres.length ? `${nombres.join(", ")} y ${ultimo}` : ultimo}`;
})();

/** Manda un mensaje con imagen por /api/mensajes/enviar (las acciones no llevan archivos grandes) */
async function enviarConImagen(
  ruta: string,
  texto: string,
  imagen: File,
  tarea: object | null,
): Promise<Respuesta> {
  const datos = new FormData();
  datos.set("chat", ruta);
  datos.set("texto", texto);
  datos.set("imagen", imagen);
  if (tarea) datos.set("tarea", JSON.stringify(tarea));
  try {
    const respuesta = await fetch("/api/mensajes/enviar", { method: "POST", body: datos });
    if (respuesta.ok) return { ok: true };
    const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, mensaje: cuerpo?.error ?? "No se ha podido enviar la imagen." };
  } catch {
    return { ok: false, mensaje: "Sin conexión: no se ha podido enviar la imagen." };
  }
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
  // La imagen elegida (o pegada, o arrastrada) que se enviará con el mensaje
  const [imagen, setImagen] = useState<{ archivo: File; url: string } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [hayNuevos, setHayNuevos] = useState(false);
  const [, empezar] = useTransition();
  // El mensaje sale al momento (en gris claro) mientras se guarda
  const [mensajes, anadirPendiente] = useOptimistic<MensajeChat[], MensajeChat>(
    props.mensajes,
    (lista, nuevo) => [...lista, nuevo],
  );
  const caja = useRef<HTMLDivElement>(null);
  const areaTexto = useRef<HTMLTextAreaElement>(null);
  const elegirArchivo = useRef<HTMLInputElement>(null);
  const pegadoAbajo = useRef(true);
  const ultimoVisto = useRef(props.mensajes.at(-1)?.id);

  // ¿Hay algo nuevo? Se pregunta la «huella» del chat cada pocos segundos (pregunta pequeña) y
  // solo si cambia se recargan los mensajes. También nada más volver a la pestaña.
  const huella = useRef(props.huella);
  useEffect(() => {
    huella.current = props.huella;
  }, [props.huella]);
  useEffect(() => {
    let vivo = true;
    let pidiendo = false;
    const mirar = async () => {
      if (pidiendo || document.visibilityState !== "visible") return;
      pidiendo = true;
      try {
        const respuesta = await fetch(`/api/mensajes/huella?chat=${encodeURIComponent(ruta)}`, {
          cache: "no-store",
        });
        if (!respuesta.ok || !vivo) return;
        const datos = (await respuesta.json()) as { huella?: string };
        if (datos.huella && datos.huella !== huella.current) {
          huella.current = datos.huella; // no volver a recargar hasta que llegue la página nueva
          router.refresh();
        }
      } catch {
        // Sin conexión: se vuelve a probar en la siguiente vuelta
      } finally {
        pidiendo = false;
      }
    };
    const id = setInterval(mirar, SEGUNDOS_REFRESCO_CHAT * 1000);
    const alVolver = () => void mirar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [router, ruta]);

  // Al abrir el chat, abajo del todo (antes de pintarse, para que no se vea el salto)
  useLayoutEffect(() => {
    const el = caja.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Cuando llega un mensaje: si estabas abajo, se baja; si estabas leyendo arriba, sale el botón
  // «Mensajes nuevos» (así no te mueve la pantalla mientras lees)
  const idUltimo = mensajes.at(-1)?.id;
  useEffect(() => {
    if (idUltimo === ultimoVisto.current) return;
    ultimoVisto.current = idUltimo;
    const el = caja.current;
    if (!el) return;
    if (pegadoAbajo.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else setHayNuevos(true);
  }, [idUltimo]);

  // La vista previa de la imagen ocupa memoria: se suelta al quitarla, al cambiarla o al salir
  const urlVistaPrevia = useRef<string | null>(null);
  useEffect(() => {
    urlVistaPrevia.current = imagen?.url ?? null;
  }, [imagen]);
  useEffect(
    () => () => {
      if (urlVistaPrevia.current) URL.revokeObjectURL(urlVistaPrevia.current);
    },
    [],
  );
  const quitarImagen = () => {
    if (imagen) URL.revokeObjectURL(imagen.url);
    setImagen(null);
    if (elegirArchivo.current) elegirArchivo.current.value = "";
  };

  const bajar = () => {
    const el = caja.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    pegadoAbajo.current = true;
    setHayNuevos(false);
  };

  const alDesplazar = () => {
    const el = caja.current;
    if (!el) return;
    pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (pegadoAbajo.current) setHayNuevos(false);
  };

  /** Pone la imagen para enviar (comprueba tipo y peso antes de subirla) */
  const ponerImagen = (archivo: File | null | undefined) => {
    if (!archivo) return;
    const problema = problemaImagen(archivo);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    if (imagen) URL.revokeObjectURL(imagen.url);
    setImagen({ archivo, url: URL.createObjectURL(archivo) });
    if (elegirArchivo.current) elegirArchivo.current.value = "";
    areaTexto.current?.focus();
  };

  // Pegar una captura (Ctrl+V) la pone como imagen
  const alPegar = (evento: ClipboardEvent<HTMLTextAreaElement>) => {
    const archivo = [...evento.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (archivo) {
      evento.preventDefault();
      ponerImagen(archivo);
    }
  };

  const alSoltar = (evento: DragEvent<HTMLElement>) => {
    setArrastrando(false);
    if (!puedeEscribir || evento.dataTransfer.files.length === 0) return;
    evento.preventDefault();
    ponerImagen(evento.dataTransfer.files[0]);
  };

  /** Mete un emoji donde está el cursor (o al final) y deja el cursor detrás */
  const meterEmoji = (emoji: string) => {
    const el = areaTexto.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fin = el?.selectionEnd ?? texto.length;
    const nuevo = (texto.slice(0, inicio) + emoji + texto.slice(fin)).slice(
      0,
      MAX_CARACTERES_MENSAJE,
    );
    setTexto(nuevo);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const cursor = inicio + emoji.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const enviar = () => {
    const limpio = texto.trim();
    if (!limpio && !imagen) return;
    const tarea = esTarea ? opciones : null;
    const conImagen = imagen;
    setError(null);
    setTexto("");
    setEsTarea(false);
    setOpciones(opcionesVacias(responsablePorDefecto));
    // La vista previa se queda para el mensaje que se está enviando: no se suelta aún
    if (conImagen) setImagen(null);
    pegadoAbajo.current = true;
    setHayNuevos(false);
    empezar(async () => {
      const responsable = personas.find((p) => p.id === tarea?.responsableId);
      anadirPendiente({
        id: `pendiente-${Date.now()}`,
        autorId: miId,
        autorNombre: "",
        texto: limpio,
        imagen: conImagen ? { ancho: null, alto: null } : null,
        vistaPrevia: conImagen?.url,
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
      const datosTarea = tarea && tareaParaEnviar(tarea);
      const respuesta = conImagen
        ? await enviarConImagen(ruta, limpio, conImagen.archivo, datosTarea)
        : await enviarMensaje(ruta, limpio, datosTarea);
      if (!respuesta.ok) {
        // Lo escrito (y la imagen) vuelve al cuadro para corregirlo
        setError(respuesta.mensaje ?? "No se ha podido enviar.");
        setTexto(limpio);
        if (conImagen)
          setImagen({ archivo: conImagen.archivo, url: URL.createObjectURL(conImagen.archivo) });
        if (tarea) {
          setEsTarea(true);
          setOpciones(tarea);
        }
      }
      router.refresh();
      // La vista previa ya no hace falta cuando llega la imagen de verdad
      if (conImagen) setTimeout(() => URL.revokeObjectURL(conImagen.url), 10_000);
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
            {general ? TODO_EL_EQUIPO : `${nombreRol(rol)} · ${textoConexion(ultimaConexionEn)}`}
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
        className="relative flex min-h-0 flex-1 flex-col"
        onDragOver={(e) => {
          if (!puedeEscribir || !e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false);
        }}
        onDrop={alSoltar}
      >
        {arrastrando && (
          <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-acento bg-white/85 text-sm font-medium text-acento">
            Suelta la imagen para enviarla
          </div>
        )}
        {hayNuevos && (
          <button
            type="button"
            onClick={bajar}
            className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 animate-tarjeta items-center gap-1.5 rounded-full bg-acento px-3 py-1.5 text-sm font-medium text-white shadow-lg"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
            Mensajes nuevos
          </button>
        )}
        <div
          ref={caja}
          onScroll={alDesplazar}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
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
                      {m.imagen && <ImagenMensaje mensaje={m} pendiente={pendiente} />}
                      {m.texto && (
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
                      )}
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
      </div>

      {puedeEscribir ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
          className="relative border-t border-linea bg-white px-3 py-2.5 sm:px-4"
        >
          {error && (
            <p role="alert" className="mx-auto mb-2 max-w-3xl text-sm text-error-oscuro">
              {error}
            </p>
          )}
          {esTarea && <OpcionesTarea valor={opciones} cambiar={setOpciones} personas={personas} />}
          {imagen && (
            <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-xl border border-linea bg-niebla p-2">
              <Image
                src={imagen.url}
                alt="Imagen que vas a enviar"
                width={64}
                height={64}
                unoptimized
                className="size-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{imagen.archivo.name || "Imagen pegada"}</p>
                <p className="text-xs text-gris">
                  {(imagen.archivo.size / 1024 / 1024).toLocaleString("es-ES", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  MB · se reduce al enviarla. Puedes añadir un texto.
                </p>
              </div>
              <button
                type="button"
                onClick={quitarImagen}
                aria-label="Quitar la imagen"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-gris hover:bg-white hover:text-tinta"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          )}
          <input
            ref={elegirArchivo}
            type="file"
            accept={TIPOS_IMAGEN_MENSAJE.join(",")}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => ponerImagen(e.target.files?.[0])}
          />
          <div className="mx-auto flex max-w-3xl items-end gap-1 sm:gap-2">
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
            <button
              type="button"
              onClick={() => elegirArchivo.current?.click()}
              aria-label="Enviar una imagen"
              title="Enviar una imagen (también puedes pegarla o arrastrarla)"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gris transition-colors hover:bg-niebla hover:text-tinta"
            >
              <ImagePlus aria-hidden="true" className="size-5" />
            </button>
            <SelectorEmojis elegir={meterEmoji} />
            <label className="sr-only" htmlFor="texto-mensaje">
              Mensaje
            </label>
            <textarea
              id="texto-mensaje"
              ref={areaTexto}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={alPulsarTecla}
              onPaste={alPegar}
              rows={1}
              maxLength={MAX_CARACTERES_MENSAJE}
              placeholder={
                esTarea
                  ? "Escribe la tarea…"
                  : imagen
                    ? "Añade un texto (opcional)"
                    : "Escribe un mensaje"
              }
              className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-linea bg-niebla px-4 py-2.5 text-[15px] outline-none focus:border-acento focus:bg-white"
            />
            <button
              type="submit"
              disabled={!texto.trim() && !imagen}
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

/**
 * La imagen de un mensaje: con su hueco reservado (no hace saltar el chat al cargar) y, al tocarla,
 * se abre en grande en otra pestaña. Mientras se envía, se ve la que eligió quien la manda.
 */
function ImagenMensaje({ mensaje, pendiente }: { mensaje: MensajeChat; pendiente: boolean }) {
  const { ancho, alto } = tamanoEnChat(mensaje.imagen?.ancho ?? null, mensaje.imagen?.alto ?? null);
  const src = mensaje.vistaPrevia ?? `/api/mensajes/imagen/${mensaje.id}`;
  const foto = (
    <Image
      src={src}
      alt={mensaje.texto ? `Imagen: ${mensaje.texto.slice(0, 80)}` : "Imagen enviada en el chat"}
      width={ancho}
      height={alto}
      unoptimized
      loading="lazy"
      className={cn(
        "block h-auto max-w-full rounded-xl bg-niebla object-cover",
        !mensaje.imagen?.ancho && "max-h-80 w-auto",
      )}
      style={{ aspectRatio: mensaje.imagen?.ancho ? `${ancho} / ${alto}` : undefined }}
    />
  );
  if (pendiente || mensaje.vistaPrevia) return <div className="-mx-1 mb-1">{foto}</div>;
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener"
      className="-mx-1 mb-1 block"
      aria-label="Abrir la imagen en grande"
    >
      {foto}
    </a>
  );
}
