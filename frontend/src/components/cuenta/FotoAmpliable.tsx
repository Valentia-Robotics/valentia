"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { FotoPerfil } from "./FotoPerfil";

/**
 * La foto de perfil que se ve en grande al pulsarla (petición de Jesse, 11-11-2026), como en WhatsApp.
 * Se cierra con la X, tocando fuera o con Escape.
 *
 * Puede ir DENTRO de un enlace (la lista de chats): al pulsar la foto se abre la foto, no el chat;
 * pulsar el resto de la fila sigue abriendo el chat. Por eso es un <span role="button"> (un <button>
 * no puede ir dentro de un <a>) y la ventana se pinta fuera, en <body>, sin que sus clics lleguen al enlace.
 */
export function FotoAmpliable({
  foto,
  nombre,
  className,
  alternativa,
}: {
  foto: string;
  nombre: string;
  className?: string;
  alternativa?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  // Si la foto no carga (salen las iniciales), no hay nada que ampliar
  const [fallida, setFallida] = useState<string | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  // El <dialog> del navegador ya cierra con Escape y no deja salir el foco del teclado
  useEffect(() => {
    const dialogo = ref.current;
    if (abierta && dialogo && !dialogo.open) dialogo.showModal();
  }, [abierta]);

  const abrir = (e: MouseEvent | KeyboardEvent) => {
    // Que no abra el chat (el enlace de la fila) ni haga nada más
    e.preventDefault();
    e.stopPropagation();
    setAbierta(true);
  };

  if (fallida === foto)
    return <FotoPerfil foto={foto} className={className} alternativa={alternativa} />;

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={`Ver la foto de ${nombre} en grande`}
        title="Ver en grande"
        onClick={abrir}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && abrir(e)}
        className="block size-full cursor-zoom-in rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
      >
        <FotoPerfil
          foto={foto}
          className={className}
          alternativa={alternativa}
          alFallar={() => setFallida(foto)}
        />
      </span>
      {abierta &&
        createPortal(
          <dialog
            ref={ref}
            aria-label={`Foto de ${nombre}`}
            onClose={() => setAbierta(false)}
            // Ningún clic de la ventana debe llegar al enlace de la fila (React los sube por el árbol)
            onClick={(e) => {
              e.stopPropagation();
              // Tocar fuera de la foto (el fondo oscuro o el hueco alrededor) la cierra
              if (!(e.target as HTMLElement).closest("[data-foto-grande]")) ref.current?.close();
            }}
            className={cn(
              "m-0 h-dvh max-h-none w-screen max-w-none bg-tinta/90 p-0",
              "backdrop:bg-transparent lg:backdrop:backdrop-blur-sm",
            )}
          >
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
              <button
                type="button"
                onClick={() => ref.current?.close()}
                aria-label="Cerrar"
                className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X aria-hidden="true" className="size-6" />
              </button>
              <Image
                data-foto-grande
                src={foto}
                alt={`Foto de perfil de ${nombre}`}
                width={512}
                height={512}
                unoptimized
                className="aspect-square w-[min(85vw,70dvh,512px)] animate-dialogo rounded-2xl bg-grafito object-cover shadow-flotante"
              />
              <p data-foto-grande className="text-center text-lg font-medium text-white">
                {nombre}
              </p>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
