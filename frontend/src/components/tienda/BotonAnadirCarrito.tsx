"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Boton } from "@/components/ui/Boton";
import { useCarrito } from "@/store/carrito";
import type { ArticuloCarrito } from "@/types/carrito";

interface Props {
  /** Lo que se añade (kit, componente suelto o configuración) */
  articulo: Omit<ArticuloCarrito, "cantidad">;
  cantidad?: number;
  texto?: string;
  variante?: ComponentProps<typeof Boton>["variante"];
  tamano?: ComponentProps<typeof Boton>["tamano"];
  className?: string;
  disabled?: boolean;
  /** Se ejecuta después de añadir (por ejemplo, para cerrar una ventana) */
  alAnadir?: () => void;
}

/**
 * Botón "Añadir al carrito" que sirve para cualquier artículo.
 * Al pulsarlo cambia a "¡Añadido!" durante un momento.
 */
export function BotonAnadirCarrito({
  articulo,
  cantidad = 1,
  texto = "Añadir al carrito",
  variante = "acento",
  tamano = "lg",
  className,
  disabled,
  alAnadir,
}: Props) {
  const anadir = useCarrito((estado) => estado.anadir);
  const [anadido, setAnadido] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Si el usuario sale de la página antes de tiempo, cancelamos el temporizador
  useEffect(() => () => clearTimeout(temporizador.current), []);

  function alPulsar() {
    anadir(articulo, cantidad);
    setAnadido(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAnadido(false), 2500);
    alAnadir?.();
  }

  return (
    <>
      <Boton
        variante={variante}
        tamano={tamano}
        onClick={alPulsar}
        disabled={disabled}
        className={className}
      >
        {anadido ? (
          <Check aria-hidden="true" className="size-5 animate-latido" />
        ) : (
          <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={1.8} />
        )}
        {anadido ? "¡Añadido!" : texto}
      </Boton>
      {/* Mensaje para lectores de pantalla */}
      <span role="status" className="sr-only">
        {anadido ? `${articulo.nombre} añadido al carrito` : ""}
      </span>
    </>
  );
}
