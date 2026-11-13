"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  Check,
  CheckCheck,
  ChevronLeft,
  Clock3,
  ClipboardList,
  ImagePlus,
  ListTodo,
  SendHorizontal,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { enviarMensaje, quitarMensaje, type Respuesta } from "@/app/mensajes/acciones";
import { textoConexion } from "@/config/equipo";
import {
  MAX_CARACTERES_MENSAJE,
  SEGUNDOS_REFRESCO_CHAT,
  TIPOS_IMAGEN_MENSAJE,
  claveDia,
  grupoDe,
  horaMensaje,
  problemaImagen,
  tamanoEnChat,
  textoDia,
  trozosConEnlaces,
} from "@/config/mensajes";
import type { GifEncontrado } from "@/config/gifs";
import type { Rol } from "@/generated/prisma/enums";
import type { LecturaDeOtro, MiembroGrupo, Mensaje } from "@/lib/mensajes/mensajes";
import { cn } from "@/lib/utils";
import {
  OpcionesTarea,
  opcionesVacias,
  tareaParaEnviar,
  type OpcionesTareaValor,
} from "./OpcionesTarea";
import { Avatar, nombreRol } from "./PantallaMensajes";
import { SelectorEmojis } from "./SelectorEmojis";
import { InfoGrupo } from "./InfoGrupo";
import { SelectorGifs } from "./SelectorGifs";
import { TarjetaTarea } from "./TarjetaTarea";
import { AvisoLlamadaEnCurso, BotonLlamar, SalaVideo, useLlamada } from "./Videollamada";
import type { EntradaLlamada, LlamadaEnCurso } from "@/lib/mensajes/llamadas";

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
  personas: { id: string; nombre: string; foto?: string | null }[];
  /** Hasta dónde ha leído cada una de las otras personas (los tics azules) */
  lecturas: LecturaDeOtro[];
  /** Solo en un grupo: quién está dentro (la ventana «Info del grupo») */
  miembros: MiembroGrupo[];
  /** La videollamada en curso de este chat (o null) */
  llamada: LlamadaEnCurso | null;
  /** Dónde se abren las llamadas: dentro de la web (JaaS) o en otra pestaña (meet.jit.si) */
  modoLlamada: EntradaLlamada["modo"];
}

/** Un mensaje en pantalla: el que se está enviando lleva la imagen elegida para verla ya */
type MensajeChat = Mensaje & { vistaPrevia?: string; fallo?: string };

/** Lo necesario para volver a mandar un mensaje que no salió */
interface Envio {
  idLocal: string;
  texto: string;
  imagen: { archivo: File; url: string } | null;
  /** Un GIF de GIPHY (se manda solo su id: el servidor lo descarga) */
  gif?: GifEncontrado | null;
  tarea: OpcionesTareaValor | null;
  creadoEn: Date;
}

/**
 * Manda un mensaje con imagen (o con un GIF, por su id) por /api/mensajes/enviar (las acciones no
 * llevan archivos grandes)
 */
async function enviarConImagen(
  ruta: string,
  texto: string,
  imagen: File | { gif: string },
  tarea: object | null,
): Promise<Respuesta> {
  const datos = new FormData();
  datos.set("chat", ruta);
  datos.set("texto", texto);
  if (imagen instanceof File) datos.set("imagen", imagen);
  else datos.set("gif", imagen.gif);
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

/** Un nombre propio para cada envío (solo en esta pantalla) */
const idLocalNuevo = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** UN CHAT ABIERTO, como en WhatsApp: burbujas, separadores de día y el cuadro para escribir */
export function Chat(props: Props) {
  const {
    ruta,
    titulo,
    foto,
    rol,
    ultimaConexionEn,
    miId,
    soyAdmin,
    puedeEscribir,
    personas,
    lecturas,
    miembros,
  } = props;
  const [verInfo, setVerInfo] = useState(false);
  // «general» = es un grupo (General, Hardware, Edición): varias personas, como en WhatsApp
  const grupo = grupoDe(ruta);
  const general = !!grupo;
  // La foto de cada persona, para ponerla junto a sus mensajes en un grupo
  const fotoDe = useMemo(() => new Map(personas.map((p) => [p.id, p.foto ?? null])), [personas]);
  const router = useRouter();
  const refrescar = useCallback(() => router.refresh(), [router]);
  const videollamada = useLlamada(ruta, props.modoLlamada, refrescar);
  const { entrar: entrarEnLlamada } = videollamada;
  // Desde el aviso «te llama» (o el push): /mensajes/<chat>?llamada=1 entra directamente
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("llamada") !== "1") return;
    url.searchParams.delete("llamada");
    window.history.replaceState(null, "", url.pathname + url.search);
    // En otra pestaña hace falta un toque (el navegador la bloquearía): queda la franja «Unirme»
    if (props.modoLlamada === "incrustada") void entrarEnLlamada();
  }, [props.modoLlamada, entrarEnLlamada]);
  const [texto, setTexto] = useState("");
  const [esTarea, setEsTarea] = useState(false);
  // En un privado, la tarea es para la otra persona salvo que se cambie
  const responsablePorDefecto = general ? "" : ruta;
  const [opciones, setOpciones] = useState<OpcionesTareaValor>(() =>
    opcionesVacias(responsablePorDefecto),
  );
  const [error, setError] = useState<string | null>(null);
  // La imagen elegida (o pegada, o arrastrada) que se enviará con el mensaje
  const [imagen, setImagen] = useState<{ archivo: File; url: string } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [hayNuevos, setHayNuevos] = useState(false);
  // Los mensajes que no han salido (un tic gris y «Reintentar»), solo en esta pantalla
  const [fallidos, setFallidos] = useState<(Envio & { error: string })[]>([]);
  // En el General: de qué mensaje mío se está mirando quién lo ha leído
  const [verLectura, setVerLectura] = useState<string | null>(null);
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

  // Los mensajes que no salieron van al final, con su aviso
  const enPantalla: MensajeChat[] = [
    ...mensajes,
    ...fallidos.map((f) => ({
      id: `fallido-${f.idLocal}`,
      autorId: miId,
      autorNombre: "",
      texto: f.texto,
      imagen: f.gif
        ? { ancho: f.gif.ancho, alto: f.gif.alto }
        : f.imagen
          ? { ancho: null, alto: null }
          : null,
      vistaPrevia: f.gif?.vistaPrevia ?? f.imagen?.url,
      creadoEn: f.creadoEn,
      esTarea: !!f.tarea,
      estadoTarea: "PENDIENTE" as const,
      prioridad: null,
      entregaEn: null,
      responsableId: null,
      responsableNombre: null,
      recordarEn: null,
      hechaEn: null,
      hechaPor: null,
      fallo: f.error,
    })),
  ];

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
    // Un aviso push (llega al momento): se mira ya, sin esperar a la siguiente vuelta
    const alAvisoPush = (evento: MessageEvent) => {
      if ((evento.data as { tipo?: string } | null)?.tipo === "aviso-push") void mirar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    navigator.serviceWorker?.addEventListener("message", alAvisoPush);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
      navigator.serviceWorker?.removeEventListener("message", alAvisoPush);
    };
  }, [router, ruta]);

  // Al abrir el chat, abajo del todo (antes de pintarse, para que no se vea el salto)
  useLayoutEffect(() => {
    const el = caja.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Cuando llega un mensaje: si estabas abajo, se baja; si estabas leyendo arriba, sale el botón
  // «Mensajes nuevos» (así no te mueve la pantalla mientras lees)
  const idUltimo = enPantalla.at(-1)?.id;
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

  /** Manda un mensaje (nuevo o reintento). Si no sale, se queda en el chat con «Reintentar» */
  const mandar = (envio: Envio) => {
    pegadoAbajo.current = true;
    setHayNuevos(false);
    empezar(async () => {
      const responsable = personas.find((p) => p.id === envio.tarea?.responsableId);
      anadirPendiente({
        id: `pendiente-${envio.idLocal}`,
        autorId: miId,
        autorNombre: "",
        texto: envio.texto,
        imagen: envio.gif
          ? { ancho: envio.gif.ancho, alto: envio.gif.alto }
          : envio.imagen
            ? { ancho: null, alto: null }
            : null,
        vistaPrevia: envio.gif?.vistaPrevia ?? envio.imagen?.url,
        creadoEn: envio.creadoEn,
        esTarea: !!envio.tarea,
        estadoTarea: "PENDIENTE",
        prioridad: null,
        entregaEn: null,
        responsableId: responsable?.id ?? null,
        responsableNombre: responsable?.nombre ?? null,
        recordarEn: null,
        hechaEn: null,
        hechaPor: null,
      });
      const datosTarea = envio.tarea && tareaParaEnviar(envio.tarea);
      let respuesta: Respuesta;
      try {
        respuesta = envio.gif
          ? await enviarConImagen(ruta, envio.texto, { gif: envio.gif.id }, datosTarea)
          : envio.imagen
            ? await enviarConImagen(ruta, envio.texto, envio.imagen.archivo, datosTarea)
            : await enviarMensaje(ruta, envio.texto, datosTarea);
      } catch {
        respuesta = { ok: false, mensaje: "Sin conexión: no se ha podido enviar." };
      }
      if (!respuesta.ok) {
        // Se queda en el chat con un tic gris, como en WhatsApp, para volver a mandarlo
        setFallidos((lista) => [
          ...lista,
          { ...envio, error: respuesta.mensaje ?? "No se ha podido enviar." },
        ]);
        return;
      }
      router.refresh();
      // La vista previa ya no hace falta cuando llega la imagen de verdad
      const url = envio.imagen?.url;
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
    areaTexto.current?.focus();
  };

  const enviar = () => {
    const limpio = texto.trim();
    if (!limpio && !imagen) return;
    setError(null);
    setTexto("");
    setEsTarea(false);
    setOpciones(opcionesVacias(responsablePorDefecto));
    // La vista previa se queda para el mensaje que se está enviando: no se suelta aún
    if (imagen) setImagen(null);
    mandar({
      idLocal: idLocalNuevo(),
      texto: limpio,
      imagen,
      tarea: esTarea ? opciones : null,
      creadoEn: new Date(),
    });
  };

  /** Un GIF se envía nada más elegirlo, solo (lo que estés escribiendo se queda en el cuadro) */
  const enviarGif = (gif: GifEncontrado) => {
    setError(null);
    mandar({
      idLocal: idLocalNuevo(),
      texto: "",
      imagen: null,
      gif,
      tarea: null,
      creadoEn: new Date(),
    });
  };

  const reintentar = (idLocal: string) => {
    const envio = fallidos.find((f) => f.idLocal === idLocal);
    if (!envio) return;
    setFallidos((lista) => lista.filter((f) => f.idLocal !== idLocal));
    mandar({ ...envio, creadoEn: new Date() });
  };

  const descartar = (idLocal: string) => {
    const envio = fallidos.find((f) => f.idLocal === idLocal);
    if (envio?.imagen) URL.revokeObjectURL(envio.imagen.url);
    setFallidos((lista) => lista.filter((f) => f.idLocal !== idLocal));
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
        {grupo ? (
          // En un grupo, tocar el nombre abre «Info del grupo» (quién está dentro), como en WhatsApp
          <button
            type="button"
            onClick={() => setVerInfo(true)}
            aria-label={`Ver quién está en ${titulo}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left hover:bg-niebla/60"
          >
            <Avatar nombre={titulo} foto={foto} grupo={grupo.canal} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{titulo}</span>
              <span className="block truncate text-xs text-gris">
                {miembros.length > 0 ? `${miembros.length} personas · ` : ""}
                Toca para ver quién está
              </span>
            </span>
          </button>
        ) : (
          <>
            <Avatar nombre={titulo} foto={foto} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-medium">{titulo}</h2>
              <p className="truncate text-xs text-gris">
                {`${nombreRol(rol)} · ${textoConexion(ultimaConexionEn)}`}
              </p>
            </div>
          </>
        )}
        {puedeEscribir && (
          <BotonLlamar
            alPulsar={() => void videollamada.entrar()}
            ocupado={videollamada.entrando}
            titulo={titulo}
          />
        )}
        <Link
          href="/mensajes/tareas"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gris hover:bg-niebla hover:text-tinta"
        >
          <ListTodo aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Tareas</span>
        </Link>
      </header>

      {props.llamada && !videollamada.sala && (
        <AvisoLlamadaEnCurso
          llamada={props.llamada}
          alUnirse={() => void videollamada.entrar()}
          ocupado={videollamada.entrando}
        />
      )}
      {videollamada.error && (
        <p
          role="alert"
          className="flex items-center gap-2 border-b border-error/30 bg-error/10 px-3 py-2 text-sm text-error-oscuro sm:px-4"
        >
          <span className="min-w-0 flex-1">{videollamada.error}</span>
          <button
            type="button"
            onClick={videollamada.quitarError}
            aria-label="Cerrar el aviso"
            className="inline-flex size-7 items-center justify-center rounded hover:bg-error/10"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </p>
      )}
      {videollamada.sala && (
        <SalaVideo sala={videollamada.sala} titulo={titulo} alColgar={videollamada.colgar} />
      )}

      {grupo && (
        <InfoGrupo
          abierto={verInfo}
          alCerrar={() => setVerInfo(false)}
          titulo={titulo}
          grupo={grupo}
          miembros={miembros}
        />
      )}

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
          {enPantalla.length === 0 && (
            <p className="mx-auto mt-10 max-w-xs rounded-lg bg-white px-4 py-3 text-center text-sm text-gris shadow-sm">
              {general
                ? `Todavía no hay mensajes. Escribe el primero para ${grupo!.para}.`
                : `Todavía no habéis hablado. Lo que escribas aquí solo lo verá ${titulo}.`}
            </p>
          )}
          <ol className="mx-auto flex max-w-3xl flex-col gap-1.5">
            {enPantalla.map((m, i) => {
              const mio = m.autorId === miId;
              const anterior = enPantalla[i - 1];
              const diaNuevo = !anterior || claveDia(anterior.creadoEn) !== claveDia(m.creadoEn);
              const mismoAutor = !diaNuevo && anterior?.autorId === m.autorId;
              const pendiente = m.id.startsWith("pendiente-");
              const fallido = !!m.fallo;
              const puedeBorrar = !pendiente && !fallido && (mio || (general && soyAdmin));
              const idLocal = m.id.replace(/^fallido-/, "");
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
                      // En el General, la foto de quien escribe va a la izquierda (como en un grupo)
                      general && !mio && "relative pl-9",
                    )}
                  >
                    {general && !mio && !mismoAutor && (
                      <span className="absolute top-0 left-0">
                        <Avatar
                          nombre={m.autorNombre}
                          foto={fotoDe.get(m.autorId ?? "") ?? null}
                          pequeno
                        />
                      </span>
                    )}
                    <div
                      className={cn(
                        "relative rounded-2xl px-3 py-2 text-[15px] shadow-sm",
                        mio ? "rounded-br-md bg-[#E3E8FF]" : "rounded-bl-md bg-white",
                        pendiente && "opacity-60",
                        fallido && "ring-1 ring-error/40",
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
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-gris">
                        <span>{horaMensaje(m.creadoEn)}</span>
                        {mio && (
                          <Tics
                            estado={
                              fallido
                                ? "fallido"
                                : pendiente
                                  ? "enviando"
                                  : leidoPorTodos(m, lecturas)
                                    ? "leido"
                                    : "enviado"
                            }
                            general={general}
                            alPulsar={
                              general && !pendiente && !fallido
                                ? () => setVerLectura((v) => (v === m.id ? null : m.id))
                                : undefined
                            }
                          />
                        )}
                      </p>
                    </div>

                    {general && verLectura === m.id && (
                      <QuienLoHaLeido mensaje={m} lecturas={lecturas} />
                    )}

                    {fallido && (
                      <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs">
                        <span className="text-error-oscuro">No se ha enviado: {m.fallo}</span>
                        <button
                          type="button"
                          onClick={() => reintentar(idLocal)}
                          className="inline-flex items-center gap-1 rounded-full bg-acento px-2.5 py-1 font-medium text-white hover:bg-acento-hover"
                        >
                          <RotateCw aria-hidden="true" className="size-3.5" />
                          Reintentar
                        </button>
                        <button
                          type="button"
                          onClick={() => descartar(idLocal)}
                          className="rounded-full border border-linea px-2.5 py-1 text-gris hover:border-tinta hover:text-tinta"
                        >
                          Quitar
                        </button>
                      </div>
                    )}

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
            <SelectorGifs elegir={enviarGif} />
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

/** ¿Lo han leído todas las demás personas del chat? (en un privado, la otra) */
function leidoPorTodos(m: Mensaje, lecturas: LecturaDeOtro[]) {
  const cuando = new Date(m.creadoEn).getTime();
  return lecturas.length > 0 && lecturas.every((l) => l.leidoHasta >= cuando);
}

/**
 * LOS TICS, como en WhatsApp:
 *   reloj = enviándose · un tic gris = no se ha enviado · dos grises = enviado, sin leer ·
 *   dos azules = leído (en el General, por todos). En el General, al tocarlos sale quién lo ha leído.
 */
function Tics({
  estado,
  general,
  alPulsar,
}: {
  estado: "enviando" | "fallido" | "enviado" | "leido";
  general: boolean;
  alPulsar?: () => void;
}) {
  const textos = {
    enviando: "Enviando",
    fallido: "No se ha enviado",
    enviado: general ? "Enviado. Aún no lo han leído todos" : "Enviado. Aún no lo ha leído",
    leido: general ? "Leído por todos" : "Leído",
  };
  const icono =
    estado === "enviando" ? (
      <Clock3 aria-hidden="true" className="size-3.5" />
    ) : estado === "fallido" ? (
      <Check aria-hidden="true" className="size-4 text-gris" />
    ) : (
      <CheckCheck
        aria-hidden="true"
        className={cn("size-4", estado === "leido" ? "text-[#1D9BF0]" : "text-gris")}
      />
    );
  if (!alPulsar)
    return (
      <span role="img" aria-label={textos[estado]} title={textos[estado]} className="inline-flex">
        {icono}
      </span>
    );
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={`${textos[estado]}. Ver quién lo ha leído`}
      title="Ver quién lo ha leído"
      className="-m-1 inline-flex rounded p-1 hover:bg-black/5"
    >
      {icono}
    </button>
  );
}

/** En el General: quién ha leído un mensaje mío y a quién le falta */
function QuienLoHaLeido({ mensaje, lecturas }: { mensaje: Mensaje; lecturas: LecturaDeOtro[] }) {
  const cuando = new Date(mensaje.creadoEn).getTime();
  const si = lecturas.filter((l) => l.leidoHasta >= cuando).map((l) => l.nombre);
  const no = lecturas.filter((l) => l.leidoHasta < cuando).map((l) => l.nombre);
  return (
    <div className="mt-1 max-w-xs animate-tarjeta rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
      <p>
        <CheckCheck aria-hidden="true" className="mr-1 inline size-3.5 text-[#1D9BF0]" />
        <strong>Leído por:</strong> {si.length ? si.join(", ") : "nadie todavía"}
      </p>
      {no.length > 0 && (
        <p className="mt-1 text-gris">
          <CheckCheck aria-hidden="true" className="mr-1 inline size-3.5" />
          <strong>Sin leer:</strong> {no.join(", ")}
        </p>
      )}
    </div>
  );
}
