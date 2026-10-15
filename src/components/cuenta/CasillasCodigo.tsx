"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Número de casillas (cifras del código) */
  cifras?: number;
  /** Se llama cada vez que cambia el código (aunque esté a medias) */
  alCambiar: (codigo: string) => void;
  /** Se llama cuando están todas las casillas rellenas */
  alCompletar: (codigo: string) => void;
  deshabilitado?: boolean;
  conError?: boolean;
  /** id del texto que explica qué hay que escribir (para lectores de pantalla) */
  idDescripcion?: string;
}

/**
 * Casillas para escribir un código de 6 cifras.
 * - Al escribir una cifra salta sola a la siguiente; con "borrar" vuelve atrás.
 * - Se puede pegar el código entero en cualquier casilla.
 * - En el móvil abre el teclado numérico y ofrece el código que llega por correo o SMS
 *   (autocomplete="one-time-code").
 * Para vaciarlas, el componente padre cambia su "key".
 */
export function CasillasCodigo({
  cifras = 6,
  alCambiar,
  alCompletar,
  deshabilitado,
  conError,
  idDescripcion,
}: Props) {
  const [digitos, setDigitos] = useState<string[]>(() => Array(cifras).fill(""));
  const casillas = useRef<(HTMLInputElement | null)[]>([]);

  const enfocar = (indice: number) => {
    const casilla = casillas.current[Math.max(0, Math.min(cifras - 1, indice))];
    casilla?.focus();
    casilla?.select();
  };

  /** Guarda las cifras nuevas y avisa al padre (y si está completo, lo envía) */
  function actualizar(nuevos: string[], siguiente: number) {
    setDigitos(nuevos);
    const codigo = nuevos.join("");
    alCambiar(codigo);
    if (nuevos.every((d) => d !== "")) {
      casillas.current[cifras - 1]?.blur();
      alCompletar(codigo);
    } else {
      enfocar(siguiente);
    }
  }

  /** Escribe una o varias cifras a partir de una casilla (varias = código pegado o autorrellenado) */
  function escribir(desde: number, texto: string) {
    const solo = texto.replace(/\D/g, "").slice(0, cifras);
    if (!solo) return;
    // Si llega el código entero, siempre empieza en la primera casilla
    const inicio = solo.length === cifras ? 0 : desde;
    const nuevos = [...digitos];
    for (let i = 0; i < solo.length && inicio + i < cifras; i++) nuevos[inicio + i] = solo[i];
    actualizar(nuevos, inicio + solo.length);
  }

  function alTeclear(indice: number, evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Backspace" && digitos[indice] === "" && indice > 0) {
      // Casilla vacía: borra la anterior y vuelve a ella
      evento.preventDefault();
      const nuevos = [...digitos];
      nuevos[indice - 1] = "";
      actualizar(nuevos, indice - 1);
    } else if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      enfocar(indice - 1);
    } else if (evento.key === "ArrowRight") {
      evento.preventDefault();
      enfocar(indice + 1);
    }
  }

  function alPegar(indice: number, evento: ClipboardEvent<HTMLInputElement>) {
    evento.preventDefault();
    escribir(indice, evento.clipboardData.getData("text"));
  }

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-3">
      {digitos.map((digito, indice) => (
        <input
          key={indice}
          ref={(el) => {
            casillas.current[indice] = el;
          }}
          value={digito}
          onChange={(e) => {
            if (e.target.value === "") {
              const nuevos = [...digitos];
              nuevos[indice] = "";
              actualizar(nuevos, indice);
            } else {
              // Si la casilla ya tenía una cifra, nos quedamos solo con la nueva
              const valor = e.target.value;
              escribir(indice, digito && valor.length === 2 ? valor.replace(digito, "") : valor);
            }
          }}
          onKeyDown={(e) => alTeclear(indice, e)}
          onPaste={(e) => alPegar(indice, e)}
          onFocus={(e) => e.target.select()}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={indice === 0 ? "one-time-code" : "off"}
          autoFocus={indice === 0}
          disabled={deshabilitado}
          aria-label={`Cifra ${indice + 1} de ${cifras}`}
          aria-describedby={idDescripcion}
          aria-invalid={conError || undefined}
          className={cn(
            "h-14 w-full min-w-0 rounded-control bg-white text-center font-titulo text-2xl ring-1 transition-shadow outline-none sm:h-16",
            "focus:ring-2 focus:ring-acento disabled:bg-niebla disabled:text-gris",
            conError ? "ring-error" : digito ? "ring-tinta/40" : "ring-linea",
          )}
        />
      ))}
    </div>
  );
}
