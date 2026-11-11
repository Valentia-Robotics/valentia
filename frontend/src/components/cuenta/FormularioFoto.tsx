"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cambiarFoto } from "@/app/(cuenta)/cuenta/acciones";
import { estadoInicial } from "@/lib/admin/formularios";
import { iniciales } from "@/components/mensajes/PantallaMensajes";
import { Aviso } from "./Aviso";
import { FotoPerfil } from "./FotoPerfil";

/**
 * Foto de perfil en "Mi cuenta": al elegir una foto se sube sola (se recorta en un cuadrado).
 * Sale en el menú y, para el equipo, en los chats de /mensajes.
 */
export function FormularioFoto({ foto, nombre }: { foto: string | null; nombre: string }) {
  const [estado, despachar, enviando] = useActionState(cambiarFoto, estadoInicial);
  const { update } = useSession();
  const router = useRouter();
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  // La foto guardada ya no existe (las subidas antes del 11-11-2026 se perdieron): hay que subirla otra vez
  const [perdida, setPerdida] = useState<string | null>(null);

  // Si ha ido bien, renovamos la sesión (el menú pasa a mostrar la foto nueva) y la página
  useEffect(() => {
    if (!estado.ok) return;
    if (entrada.current) entrada.current.value = "";
    void update().then(() => router.refresh());
  }, [estado, update, router]);

  const enviar = (quitar: boolean) => {
    const datos = new FormData();
    if (quitar) datos.set("quitar", "si");
    else if (entrada.current?.files?.[0]) datos.set("foto", entrada.current.files[0]);
    startTransition(() => despachar(datos));
  };

  const error = estado.errores?.foto;

  return (
    <div className="max-w-md space-y-4">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      {foto && perdida === foto && !estado.mensaje && (
        <Aviso tipo="error">
          Tu foto se ha perdido y los demás no la ven. Súbela otra vez con «Cambiar foto».
        </Aviso>
      )}
      <div className="flex items-center gap-5">
        <span className="inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-tinta font-titulo text-2xl text-white">
          {foto ? (
            <FotoPerfil
              foto={foto}
              className="size-full"
              alternativa={iniciales(nombre)}
              alFallar={() => setPerdida(foto)}
            />
          ) : (
            iniciales(nombre)
          )}
        </span>
        <div className="min-w-0 text-sm">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={id}
              aria-disabled={enviando || undefined}
              className="inline-flex h-10 cursor-pointer items-center rounded-boton bg-tinta px-4 font-medium text-white transition-colors hover:bg-grafito aria-disabled:pointer-events-none aria-disabled:opacity-60"
            >
              {enviando ? "Subiendo…" : foto ? "Cambiar foto" : "Poner foto"}
            </label>
            {foto && (
              <button
                type="button"
                disabled={enviando}
                onClick={() => enviar(true)}
                className="inline-flex h-10 items-center rounded-boton bg-white px-4 font-medium ring-1 ring-linea transition-colors hover:ring-tinta/40 disabled:opacity-60"
              >
                Quitar
              </button>
            )}
          </div>
          <input
            ref={entrada}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={enviando}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-d`}
            onChange={(e) => e.target.files?.[0] && enviar(false)}
          />
          <p
            id={`${id}-d`}
            className={error ? "mt-2 text-xs text-error" : "mt-2 text-xs text-gris"}
          >
            {error ?? "JPG, PNG o WebP, hasta 5 MB. La recortamos en cuadrado."}
          </p>
        </div>
      </div>
    </div>
  );
}
