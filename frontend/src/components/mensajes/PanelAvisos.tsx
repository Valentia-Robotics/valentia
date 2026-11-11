"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BellOff, BellRing, ChevronLeft, Laptop, Smartphone } from "lucide-react";
import {
  activarAvisos,
  desactivarAvisos,
  esIOS,
  estadoAvisos,
  instalada,
  type EstadoAvisos,
} from "@/lib/push/cliente";
import { cn } from "@/lib/utils";

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" });

const TEXTO_ESTADO: Record<EstadoAvisos, { titulo: string; texto: string }> = {
  activado: {
    titulo: "Los avisos están activados en este aparato",
    texto: "Te saldrá un aviso con cada mensaje nuevo, aunque tengas la web cerrada.",
  },
  apagado: {
    titulo: "Los avisos están apagados en este aparato",
    texto: "Pulsa «Activar avisos» y, cuando el navegador pregunte, di «Permitir».",
  },
  bloqueado: {
    titulo: "El navegador tiene los avisos bloqueados",
    texto:
      "Un día se dijo «Bloquear». Hay que cambiarlo en los ajustes del navegador (mira abajo) y volver aquí.",
  },
  "instalar-ios": {
    titulo: "En el iPhone hay que añadir la web a la pantalla de inicio",
    texto: "Apple solo deja mandar avisos a las webs añadidas como app. Sigue los pasos de abajo.",
  },
  "no-hay": {
    titulo: "Este navegador no puede recibir avisos",
    texto: "Prueba con Chrome, Edge, Firefox o Safari actualizados.",
  },
};

/**
 * EL PANEL DE AVISOS (/mensajes/avisos): en qué punto está este aparato, botones para activar,
 * probar y desactivar, y la guía paso a paso para Android, iPhone y ordenador.
 */
export function PanelAvisos({
  email,
  aparatos,
}: {
  email: string;
  aparatos: { aparato: string; creadaEn: string }[];
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  const [comoApp, setComoApp] = useState(false);

  useEffect(() => {
    void estadoAvisos().then((e) => {
      setApple(esIOS());
      setComoApp(instalada());
      setEstado(e);
    });
  }, []);

  const hacer = async (accion: () => Promise<EstadoAvisos>) => {
    setOcupado(true);
    setNota(null);
    try {
      const nuevo = await accion();
      setEstado(nuevo);
      if (nuevo === "bloqueado")
        setNota("El navegador ha dicho que no. Mira abajo cómo cambiarlo.");
      router.refresh();
    } catch {
      setNota("No se ha podido. Recarga la página y vuelve a probar.");
    } finally {
      setOcupado(false);
    }
  };

  const probar = async () => {
    setOcupado(true);
    setNota(null);
    try {
      const respuesta = await fetch("/api/push/prueba", { method: "POST" });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      setNota(
        respuesta.ok
          ? "Aviso enviado. Debería salirte en unos segundos (si estás en esta página del ordenador, mira la esquina de la pantalla)."
          : (datos.error ?? "No se ha podido mandar la prueba."),
      );
    } finally {
      setOcupado(false);
    }
  };

  const info = estado ? TEXTO_ESTADO[estado] : null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link
          href="/mensajes"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gris hover:text-tinta"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Volver a los mensajes
        </Link>
        <h1 className="text-2xl font-medium">Avisos de los mensajes</h1>
        <p className="mt-1 text-gris">
          Para enterarte al momento, como en WhatsApp: te sale un aviso en el móvil o el ordenador
          con cada mensaje y cada recordatorio de tarea. Hay que activarlo{" "}
          <strong>una vez en cada aparato</strong> (móvil, portátil…).
        </p>

        <section
          aria-live="polite"
          className={cn(
            "mt-6 rounded-xl border-2 bg-white p-5",
            estado === "activado" ? "border-exito" : "border-acento",
          )}
        >
          {info ? (
            <>
              <p className="flex items-center gap-2 font-semibold">
                {estado === "activado" ? (
                  <BellRing aria-hidden="true" className="size-5 text-exito" />
                ) : (
                  <BellOff aria-hidden="true" className="size-5 text-acento" />
                )}
                {info.titulo}
              </p>
              <p className="mt-1 text-sm text-gris">{info.texto}</p>
            </>
          ) : (
            <p className="text-sm text-gris">Mirando este aparato…</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {estado === "apagado" && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => hacer(() => activarAvisos(email))}
                className="rounded-full bg-acento px-4 py-2 text-sm font-medium text-white hover:bg-acento-hover disabled:opacity-60"
              >
                {ocupado ? "Un momento…" : "Activar avisos"}
              </button>
            )}
            {estado === "activado" && (
              <>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={probar}
                  className="rounded-full bg-acento px-4 py-2 text-sm font-medium text-white hover:bg-acento-hover disabled:opacity-60"
                >
                  Mandarme un aviso de prueba
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => hacer(desactivarAvisos)}
                  className="rounded-full border border-linea px-4 py-2 text-sm hover:border-tinta"
                >
                  Desactivar en este aparato
                </button>
              </>
            )}
          </div>
          {nota && <p className="mt-3 text-sm">{nota}</p>}
        </section>

        {aparatos.length > 0 && (
          <section className="mt-6">
            <h2 className="font-medium">Tus aparatos con avisos</h2>
            <ul className="mt-2 divide-y divide-linea rounded-xl border border-linea bg-white text-sm">
              {aparatos.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span>{a.aparato}</span>
                  <span className="text-gris">desde el {fecha.format(new Date(a.creadaEn))}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <h2 className="mt-10 text-lg font-medium">Paso a paso</h2>

        <Guia
          icono={<Smartphone aria-hidden="true" className="size-5" />}
          titulo="iPhone o iPad"
          abierta={apple}
          pasos={[
            "Abre valentiarobotics.com/mensajes en Safari (tiene que ser Safari) e inicia sesión.",
            "Toca el botón Compartir (el cuadrado con la flecha hacia arriba, abajo en el centro).",
            "Baja y toca «Añadir a pantalla de inicio» → «Añadir». Sale el icono de Valentia Equipo.",
            "Cierra Safari y abre la web DESDE ESE ICONO (si no, el iPhone no deja activar los avisos).",
            "Vuelve a esta página (Mensajes → Avisos), toca «Activar avisos» y luego «Permitir».",
            "Toca «Mandarme un aviso de prueba» para comprobarlo. Hace falta iOS 16.4 o más nuevo.",
          ]}
          nota={
            apple && !comoApp
              ? "Ahora mismo estás en Safari: haz los pasos 2 a 4 y vuelve aquí desde el icono."
              : undefined
          }
          bloqueado="Si un día dijiste «No permitir»: Ajustes del iPhone → Notificaciones → Valentia Equipo → Permitir notificaciones."
        />

        <Guia
          icono={<Smartphone aria-hidden="true" className="size-5" />}
          titulo="Android"
          abierta={!apple}
          pasos={[
            "Abre valentiarobotics.com/mensajes en Chrome e inicia sesión.",
            "Toca «Activar avisos» (aquí arriba) y luego «Permitir».",
            "Toca «Mandarme un aviso de prueba» para comprobarlo.",
            "Recomendado: menú ⋮ de Chrome → «Añadir a pantalla de inicio» (o «Instalar app»). Así tienes el icono con el número de mensajes sin leer, como WhatsApp.",
          ]}
          bloqueado="Si sale bloqueado: toca el candado o los ajustes junto a la dirección → Permisos → Notificaciones → Permitir. Mira también Ajustes del móvil → Aplicaciones → Chrome → Notificaciones, y que el móvil no esté en «No molestar»."
        />

        <Guia
          icono={<Laptop aria-hidden="true" className="size-5" />}
          titulo="Ordenador (Windows o Mac)"
          abierta={false}
          pasos={[
            "Abre la web en Chrome, Edge, Firefox o Safari e inicia sesión.",
            "Ve a Mensajes → Avisos, pulsa «Activar avisos» y luego «Permitir».",
            "Pulsa «Mandarme un aviso de prueba»: sale en la esquina de la pantalla.",
            "Los avisos llegan aunque la pestaña esté cerrada, mientras el navegador esté abierto. Con la pestaña abierta, además suena un «tilín» y el título parpadea.",
          ]}
          bloqueado="Si no salen: pulsa el candado junto a la dirección → Notificaciones → Permitir. En Windows mira también Configuración → Sistema → Notificaciones (y que no esté en «No molestar»); en el Mac, Ajustes del Sistema → Notificaciones → tu navegador."
        />
      </div>
    </div>
  );
}

function Guia({
  icono,
  titulo,
  pasos,
  bloqueado,
  nota,
  abierta,
}: {
  icono: React.ReactNode;
  titulo: string;
  pasos: string[];
  bloqueado: string;
  nota?: string;
  abierta: boolean;
}) {
  return (
    <details open={abierta} className="mt-3 rounded-xl border border-linea bg-white p-4">
      <summary className="flex cursor-pointer items-center gap-2 font-medium">
        {icono}
        {titulo}
      </summary>
      {nota && <p className="mt-3 rounded-lg bg-acento/10 px-3 py-2 text-sm">{nota}</p>}
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
        {pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-gris">{bloqueado}</p>
    </details>
  );
}
