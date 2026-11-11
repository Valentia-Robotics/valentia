"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { entregarGuion, guardarNotas, guardarPasos } from "@/app/editor/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { CampoAdmin } from "@/components/admin/campos";
import { useFormulario } from "@/components/admin/useFormulario";
import { PASOS_EDICION } from "@/config/estadosGuion";
import { cn } from "@/lib/utils";

const MAXIMO_NOTAS = 20_000;
const hora = new Intl.DateTimeFormat("es-ES", { timeStyle: "short" });

/**
 * Zona de trabajo del editor: sus notas o su versión adaptada (el guion aprobado no cambia).
 * Se guarda sola un segundo después de dejar de escribir; también con Ctrl+S (o ⌘+S) y al salir
 * del cuadro. Si intentas cerrar la pestaña con algo sin guardar, el navegador avisa.
 */
export function ZonaTrabajo({ guionId, notas }: { guionId: string; notas: string | null }) {
  const [texto, setTexto] = useState(notas ?? "");
  const [guardado, setGuardado] = useState(notas ?? "");
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, iniciar] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendiente = texto !== guardado;

  const guardar = (valor: string) => {
    clearTimeout(temporizador.current);
    if (valor === guardado) return;
    iniciar(async () => {
      const respuesta = await guardarNotas(guionId, valor);
      if (respuesta.ok) {
        setGuardado(valor);
        setEstado({ tipo: "ok", texto: `Guardado a las ${hora.format(new Date())}` });
      } else {
        setEstado({ tipo: "error", texto: respuesta.mensaje ?? "No se pudo guardar." });
      }
    });
  };

  // Guardado automático: un segundo sin teclear
  useEffect(() => {
    if (!pendiente) return;
    temporizador.current = setTimeout(() => guardar(texto), 1000);
    return () => clearTimeout(temporizador.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia el texto
  }, [texto]);

  // Aviso del navegador al cerrar con cambios sin guardar
  useEffect(() => {
    if (!pendiente) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendiente]);

  return (
    <div className="space-y-2">
      <label htmlFor="notas-editor" className="block text-sm font-medium">
        Tus notas o tu versión adaptada
      </label>
      <textarea
        id="notas-editor"
        value={texto}
        maxLength={MAXIMO_NOTAS}
        rows={10}
        onChange={(evento) => setTexto(evento.target.value)}
        onBlur={() => guardar(texto)}
        onKeyDown={(evento) => {
          if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "s") {
            evento.preventDefault();
            guardar(texto);
          }
        }}
        placeholder="Ideas de planos, cambios de texto, música, enlaces al material…"
        className="w-full rounded-md bg-white px-3 py-2 text-sm leading-relaxed ring-1 ring-linea outline-none focus:ring-2 focus:ring-acento"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gris">
        <p aria-live="polite" className={cn(estado?.tipo === "error" && "text-error-oscuro")}>
          {guardando
            ? "Guardando…"
            : pendiente
              ? "Cambios sin guardar"
              : (estado?.texto ?? "Se guarda solo mientras escribes (también con Ctrl+S)")}
        </p>
        <p className="tabular-nums">
          {texto.length.toLocaleString("es-ES")} / {MAXIMO_NOTAS.toLocaleString("es-ES")}
        </p>
      </div>
    </div>
  );
}

/** Los pasos de edición: se marcan con un clic y se guardan al momento */
export function PasosEdicion({
  guionId,
  hechos,
  editable,
}: {
  guionId: string;
  hechos: string[];
  editable: boolean;
}) {
  // Se marca al momento; si el servidor no lo guarda, vuelve a como estaba
  const [marcados, setMarcados] = useState(hechos);
  const [error, setError] = useState("");
  const [, iniciar] = useTransition();
  const total = PASOS_EDICION.length;
  const cuantos = PASOS_EDICION.filter((p) => marcados.includes(p.id)).length;

  const cambiar = (id: string) => {
    const antes = marcados;
    const nuevos = antes.includes(id) ? antes.filter((p) => p !== id) : [...antes, id];
    setMarcados(nuevos);
    iniciar(async () => {
      const respuesta = await guardarPasos(guionId, nuevos);
      if (!respuesta.ok) setMarcados(antes);
      setError(respuesta.ok ? "" : (respuesta.mensaje ?? "No se pudo guardar."));
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-tinta/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={cuantos}
          aria-label="Pasos hechos"
        >
          <div
            className="h-full rounded-full bg-exito transition-[width] duration-300"
            style={{ width: `${(cuantos / total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gris tabular-nums">
          {cuantos}/{total}
        </span>
      </div>
      <ul className="space-y-1">
        {PASOS_EDICION.map((paso) => {
          const hecho = marcados.includes(paso.id);
          return (
            <li key={paso.id}>
              <label
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                  editable ? "cursor-pointer hover:bg-niebla" : "opacity-80",
                )}
              >
                <input
                  type="checkbox"
                  checked={hecho}
                  disabled={!editable}
                  onChange={() => cambiar(paso.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded ring-1 peer-focus-visible:ring-2 peer-focus-visible:ring-acento",
                    hecho ? "bg-exito text-white ring-exito" : "bg-white ring-linea",
                  )}
                >
                  {hecho && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={cn(hecho && "text-gris line-through")}>{paso.texto}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-error-oscuro">{error}</p>}
    </div>
  );
}

/** Entregar: pegar el enlace del vídeo terminado */
export function FormularioEntrega({ guionId, enlace }: { guionId: string; enlace: string | null }) {
  const { estado, alEnviar, enviando, error } = useFormulario(entregarGuion);

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-3">
      {!estado.ok && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <input type="hidden" name="guionId" value={guionId} />
      <CampoAdmin
        etiqueta="Enlace del vídeo terminado"
        name="enlaceVideo"
        type="url"
        inputMode="url"
        placeholder="https://…"
        defaultValue={enlace ?? ""}
        ayuda="Drive, YouTube o donde lo tengas"
        error={error("enlaceVideo")}
      />
      <BotonAdmin type="submit" disabled={enviando}>
        {enviando ? "Entregando…" : "Entregar"}
      </BotonAdmin>
    </form>
  );
}
