"use client";

import { Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { guardarResena, leerMiResena, type MiResena } from "@/app/(tienda)/kits/[slug]/acciones";
import { useFormulario } from "@/components/admin/useFormulario";
import { Aviso } from "@/components/cuenta/Aviso";
import { Boton } from "@/components/ui/Boton";
import { configResenas } from "@/config/resenas";
import { cn } from "@/lib/utils";

const NOMBRES = ["Muy mal", "Mal", "Regular", "Bien", "¡Genial!"];

/**
 * Formulario para opinar sobre un kit. La ficha del kit es una página ya preparada (igual para todos),
 * así que lo que depende de quién eres (si puedes opinar y tu reseña anterior) se pide al abrirla.
 */
export function FormularioResena({ slug }: { slug: string }) {
  const { status } = useSession();
  const [mia, setMia] = useState<MiResena | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let vigente = true;
    leerMiResena(slug)
      .then((datos) => vigente && setMia(datos))
      .catch(() => vigente && setMia({ conSesion: true, puede: false, resena: null }));
    return () => {
      vigente = false;
    };
  }, [slug, status]);

  if (status === "loading" || (status === "authenticated" && !mia)) {
    return <p className="text-sm text-gris">Cargando…</p>;
  }

  if (status !== "authenticated" || !mia?.conSesion) {
    return (
      <p className="text-gris">
        ¿Tienes este kit?{" "}
        <a
          href={`/login?callbackUrl=${encodeURIComponent(`/kits/${slug}#opiniones`)}`}
          className="font-medium text-acento underline underline-offset-4"
        >
          Inicia sesión
        </a>{" "}
        para contarnos qué te ha parecido.
      </p>
    );
  }

  if (!mia.puede) {
    return (
      <p className="text-gris">
        Podrás opinar en cuanto actives el curso de este kit con el código QR de la caja.
      </p>
    );
  }

  return <Formulario slug={slug} anterior={mia.resena} />;
}

function Formulario({ slug, anterior }: { slug: string; anterior: MiResena["resena"] }) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarResena);
  const [estrellas, setEstrellas] = useState(anterior?.estrellas ?? 0);

  return (
    <form onSubmit={alEnviar} noValidate className="max-w-xl space-y-5">
      <input type="hidden" name="slug" value={slug} />
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      {!estado.mensaje && anterior?.estado === "OCULTA" && (
        <Aviso>Tu opinión anterior no se muestra en la tienda.</Aviso>
      )}

      <fieldset>
        <legend className="text-sm font-medium">
          {anterior ? "Tu opinión (puedes cambiarla)" : "¿Qué nota le das?"}
        </legend>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="cursor-pointer rounded-md p-0.5 has-focus-visible:ring-2 has-focus-visible:ring-acento"
            >
              <input
                type="radio"
                name="estrellas"
                value={n}
                checked={estrellas === n}
                onChange={() => setEstrellas(n)}
                className="sr-only"
              />
              <span className="sr-only">
                {n} {n === 1 ? "estrella" : "estrellas"}: {NOMBRES[n - 1]}
              </span>
              <Star
                aria-hidden="true"
                className={cn(
                  "size-8 transition-colors",
                  n <= estrellas ? "text-aviso" : "text-linea",
                )}
                fill="currentColor"
                strokeWidth={0}
              />
            </label>
          ))}
          {estrellas > 0 && (
            <span className="ml-2 text-sm text-gris">{NOMBRES[estrellas - 1]}</span>
          )}
        </div>
        {error("estrellas") && <p className="mt-1.5 text-sm text-error">{error("estrellas")}</p>}
      </fieldset>

      <div>
        <label htmlFor="texto-resena" className="block text-sm font-medium">
          Tu comentario
        </label>
        <textarea
          id="texto-resena"
          name="texto"
          rows={4}
          maxLength={configResenas.textoMaximo}
          defaultValue={anterior?.texto}
          placeholder="¿Qué te ha gustado? ¿Fue fácil de montar?"
          aria-invalid={error("texto") ? true : undefined}
          aria-describedby="ayuda-resena"
          className={cn(
            "mt-1.5 w-full rounded-control bg-white px-4 py-3 text-base ring-1 transition-shadow outline-none",
            "placeholder:text-gris-claro focus:ring-2 focus:ring-acento",
            error("texto") ? "ring-error" : "ring-linea",
          )}
        />
        <p
          id="ayuda-resena"
          className={cn("mt-1.5 text-sm", error("texto") ? "text-error" : "text-gris")}
        >
          {error("texto") ?? "Se publicará con tu nombre y la inicial de tu apellido."}
        </p>
      </div>

      <Boton type="submit" variante="primario" tamano="lg" disabled={enviando}>
        {enviando ? "Enviando…" : anterior ? "Guardar cambios" : "Publicar mi opinión"}
      </Boton>
    </form>
  );
}
