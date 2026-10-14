"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { useCarrito } from "@/store/carrito";

interface Props {
  slug: string;
  nombre: string;
  precioCentimos: number;
  imagen: string;
}

/** Botón "Añadir al carrito" de la ficha de un kit, con confirmación visual. */
export function BotonAnadirKit({ slug, nombre, precioCentimos, imagen }: Props) {
  const anadir = useCarrito((estado) => estado.anadir);
  const [anadido, setAnadido] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Si el usuario sale de la página antes de tiempo, cancelamos el temporizador
  useEffect(() => () => clearTimeout(temporizador.current), []);

  function alPulsar() {
    anadir({ id: `kit:${slug}`, tipo: "kit", nombre, precioCentimos, imagen });
    setAnadido(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAnadido(false), 2500);
  }

  return (
    <>
      <Boton variante="acento" tamano="lg" onClick={alPulsar} className="w-full sm:w-auto">
        {anadido ? (
          <Check aria-hidden="true" className="size-5 animate-latido" />
        ) : (
          <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={1.8} />
        )}
        {anadido ? "¡Añadido!" : "Añadir al carrito"}
      </Boton>
      {/* Mensaje para lectores de pantalla */}
      <span role="status" className="sr-only">
        {anadido ? `${nombre} añadido al carrito` : ""}
      </span>
    </>
  );
}
