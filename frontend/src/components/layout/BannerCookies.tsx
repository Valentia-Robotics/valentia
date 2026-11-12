"use client";

import Link from "next/link";
import { useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { Dialogo } from "@/components/ui/Dialogo";
import { hayAnalitica } from "@/config/analitica";
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
    // Con la clase «tienda» el aviso usa siempre el estilo industrial (también si sale en un panel)
    <div className="tienda contents">
      {mostrarBanner && (
        <section
          aria-label="Aviso de cookies"
          // Con nombre propio se queda quieto y encima mientras cambia la página (globals.css)
          style={{ viewTransitionName: "aviso-cookies" }}
          // Pequeño y en una esquina: no tapa la página (antes ocupaba media pantalla en el móvil)
          className="fixed inset-x-3 bottom-3 z-[55] border border-borde-fuerte bg-panel p-4 shadow-flotante sm:right-auto sm:bottom-5 sm:left-5 sm:max-w-sm print:hidden"
        >
          <p className="mono-etiqueta mb-2 text-gris-claro">
            <span aria-hidden="true" className="text-acento">
              {"// "}
            </span>
            Cookies
          </p>
          <p className="text-sm leading-relaxed text-gris">
            Usamos las cookies necesarias para que la web funcione y, si quieres, las de los vídeos
            de los cursos{hayAnalitica && " y las de Google Analytics"}.{" "}
            <Link href="/legal/cookies" className="text-tinta underline underline-offset-2">
              Más información
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Boton variante="primario" onClick={aceptarTodo}>
              Aceptar
            </Boton>
            <Boton variante="secundario" onClick={rechazarTodo}>
              Solo necesarias
            </Boton>
            <button
              type="button"
              onClick={abrirPanel}
              className="mono-etiqueta ml-auto px-2 py-2 text-gris underline-offset-4 hover:text-tinta hover:underline"
            >
              Configurar
            </button>
          </div>
        </section>
      )}
      <Dialogo abierto={panelAbierto} alCerrar={cerrarPanel} titulo="Configurar cookies">
        <PanelPreferencias />
      </Dialogo>
    </div>
  );
}

/** Detalle por categorías, con un interruptor para cada una opcional */
function PanelPreferencias() {
  const { preferencias, guardar } = useConsentimiento();
  const [videos, setVideos] = useState(preferencias.videos);
  const [analitica, setAnalitica] = useState(preferencias.analitica);

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
      {hayAnalitica && (
        <Categoria
          titulo="Analítica (Google Analytics)"
          texto="Nos dice, de forma agregada, qué páginas se visitan y desde dónde llega la gente, para mejorar la web. Google guarda sus cookies (_ga) y trata estos datos según su política. Sin tu permiso no se carga."
          activa={analitica}
          alCambiar={setAnalitica}
        />
      )}
      <p className="text-gris">
        Puedes cambiar tu elección cuando quieras desde «Configurar cookies», al final de cada
        página. Más detalles en la{" "}
        <Link href="/legal/cookies" className="text-acento underline underline-offset-2">
          política de cookies
        </Link>
        .
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Boton variante="secundario" onClick={() => guardar({ videos: false, analitica: false })}>
          Rechazar opcionales
        </Boton>
        <Boton
          variante="primario"
          onClick={() => guardar({ videos, analitica: hayAnalitica && analitica })}
        >
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
    <label className="flex items-start justify-between gap-4 border border-linea bg-carbon p-4">
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
