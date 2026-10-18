"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { Dialogo } from "@/components/ui/Dialogo";
import { useConsentimiento, useConsentimientoHidratado } from "@/store/consentimiento";

/**
 * BANNER DE COOKIES
 * Aparece abajo mientras no se haya elegido. «Rechazar» y «Aceptar todas» tienen el mismo
 * tamaño y color (así lo pide la AEPD). «Configurar» abre el detalle por categorías.
 * También se abre desde «Configurar cookies» del pie de página.
 */
export function BannerCookies() {
  const hidratado = useConsentimientoHidratado();
  const { decididoEn, panelAbierto, aceptarTodo, rechazarTodo, abrirPanel, cerrarPanel } =
    useConsentimiento();

  if (!hidratado) return null;
  // Una elección de hace más de 12 meses ya se descarta al leerla (ver store/consentimiento.ts)
  const mostrarBanner = decididoEn === null && !panelAbierto;

  return (
    <>
      {mostrarBanner && (
        <section
          aria-label="Aviso de cookies"
          className="fixed inset-x-3 bottom-3 z-[55] mx-auto max-w-3xl rounded-tarjeta bg-white p-5 shadow-flotante ring-1 ring-linea sm:p-6 print:hidden"
        >
          <div className="flex items-start gap-3">
            <Cookie aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-acento" />
            <div className="text-sm">
              <h2 className="font-sans text-base font-semibold">Tu privacidad, tu decisión</h2>
              <p className="mt-1 text-gris">
                Usamos cookies necesarias para que la web funcione (sesión, carrito y pago). Con tu
                permiso, también cargamos los reproductores de vídeo de YouTube y Vimeo en los
                cursos, que ponen sus propias cookies. No usamos cookies de publicidad.{" "}
                <Link href="/legal/cookies" className="text-acento underline underline-offset-2">
                  Más información
                </Link>
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Boton variante="enlace" onClick={abrirPanel} className="sm:mr-auto">
              Configurar
            </Boton>
            <Boton variante="primario" onClick={rechazarTodo}>
              Rechazar opcionales
            </Boton>
            <Boton variante="primario" onClick={aceptarTodo}>
              Aceptar todas
            </Boton>
          </div>
        </section>
      )}
      <Dialogo abierto={panelAbierto} alCerrar={cerrarPanel} titulo="Configurar cookies">
        <PanelPreferencias />
      </Dialogo>
    </>
  );
}

/** Detalle por categorías, con un interruptor para cada una opcional */
function PanelPreferencias() {
  const { preferencias, guardar } = useConsentimiento();
  const [videos, setVideos] = useState(preferencias.videos);

  return (
    <div className="space-y-5 p-5 text-sm">
      <Categoria
        titulo="Necesarias"
        texto="Mantienen tu sesión, tu carrito, la seguridad de tu cuenta y el pago con Stripe. Sin ellas la web no funciona, así que siempre están activas."
        activa
        fija
      />
      <Categoria
        titulo="Vídeos de los cursos (YouTube y Vimeo)"
        texto="Cargan los reproductores de YouTube y Vimeo dentro de las lecciones. Estos servicios pueden guardar cookies y saber que has visto el vídeo. Si no las aceptas, verás un aviso en lugar del vídeo y podrás activarlo cuando quieras."
        activa={videos}
        alCambiar={setVideos}
      />
      <p className="text-gris">
        Puedes cambiar tu elección cuando quieras desde «Configurar cookies», al final de cada
        página. Más detalles en la{" "}
        <Link href="/legal/cookies" className="text-acento underline underline-offset-2">
          política de cookies
        </Link>
        .
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Boton variante="secundario" onClick={() => guardar({ videos: false })}>
          Rechazar opcionales
        </Boton>
        <Boton variante="primario" onClick={() => guardar({ videos })}>
          Guardar mi elección
        </Boton>
      </div>
    </div>
  );
}

function Categoria({
  titulo,
  texto,
  activa,
  fija,
  alCambiar,
}: {
  titulo: string;
  texto: string;
  activa: boolean;
  fija?: boolean;
  alCambiar?: (activa: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-control bg-niebla p-4">
      <span>
        <span className="block font-medium">{titulo}</span>
        <span className="mt-1 block text-gris">{texto}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={activa}
        disabled={fija}
        onChange={(e) => alCambiar?.(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-acento"
      />
    </label>
  );
}
