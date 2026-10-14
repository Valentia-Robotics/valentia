"use client";

import Image from "next/image";
import { ImageUp } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Campo para subir una foto, con vista previa.
 * Si ya hay una foto ("actual"), se ve hasta que eliges otra.
 * La comprobación de verdad (formato y tamaño) se hace en el servidor.
 */
export function CampoImagen({
  etiqueta = "Foto",
  actual,
  error,
  name = "foto",
}: {
  etiqueta?: string;
  actual?: string;
  error?: string;
  name?: string;
}) {
  const id = useId();
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);

  // Libera la vista previa anterior al cambiar de foto (para no gastar memoria)
  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  const imagen = vistaPrevia ?? actual;

  return (
    <div>
      <p className="text-[13px] font-medium">{etiqueta}</p>
      <div className="mt-1 flex items-center gap-4">
        <div
          className={cn(
            "flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-niebla ring-1",
            error ? "ring-error" : "ring-linea",
          )}
        >
          {imagen ? (
            <Image
              src={imagen}
              alt="Vista previa de la foto"
              width={112}
              height={112}
              unoptimized
              className="size-full object-contain p-1"
            />
          ) : (
            <ImageUp aria-hidden="true" className="size-8 text-gris-claro" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 text-sm">
          <label
            htmlFor={id}
            className="inline-flex h-9 cursor-pointer items-center rounded-md bg-white px-3.5 font-medium ring-1 ring-linea hover:ring-tinta/40"
          >
            {imagen ? "Cambiar foto" : "Elegir foto"}
          </label>
          <input
            id={id}
            name={name}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-d`}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              setVistaPrevia(archivo ? URL.createObjectURL(archivo) : null);
            }}
          />
          <p id={`${id}-d`} className={cn("mt-1.5 text-xs", error ? "text-error" : "text-gris")}>
            {error ?? "JPG, PNG o WebP, hasta 5 MB. Se reduce y se convierte a WebP sola."}
          </p>
        </div>
      </div>
    </div>
  );
}
