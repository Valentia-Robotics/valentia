"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { confirmarCodigo, pedirOtroCodigo } from "@/app/(auth)/verificar/acciones";
import { Boton } from "@/components/ui/Boton";
import { cn } from "@/lib/utils";
import { Aviso } from "./Aviso";
import { CasillasCodigo } from "./CasillasCodigo";

interface Props {
  /** Segundos que faltan para poder pedir otro código */
  esperaInicial: number;
  /** A dónde ir después (ya comprobado con rutaSegura) */
  volver: string;
  /** A dónde ir si hay que volver a empezar */
  enlaceReinicio: { href: string; texto: string };
  /** id del texto que explica a qué email se ha enviado */
  idDescripcion: string;
}

type Mensaje = { tipo: "error" | "exito"; texto: string; reiniciar?: boolean };

/**
 * Formulario del código de 6 cifras: se envía solo al rellenar la última casilla.
 * Incluye el botón "Reenviar código" con su cuenta atrás.
 */
export function FormularioCodigo({ esperaInicial, volver, enlaceReinicio, idDescripcion }: Props) {
  const [codigo, setCodigo] = useState("");
  // Cambiar este número vacía las casillas (el componente se vuelve a crear)
  const [reinicio, setReinicio] = useState(0);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(esperaInicial);
  const [reenviando, setReenviando] = useState(false);
  const ocupado = useRef(false);

  // Cuenta atrás del botón "Reenviar código"
  useEffect(() => {
    if (espera <= 0) return;
    const temporizador = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [espera]);

  async function confirmar(valor: string) {
    if (ocupado.current || valor.length !== 6) return;
    ocupado.current = true;
    setEnviando(true);
    setMensaje(null);
    try {
      const resultado = await confirmarCodigo(valor, volver);
      if (resultado.ok) {
        // ¡Correcto! Recargamos en el destino para que toda la web vea la sesión
        window.location.assign(resultado.destino);
        return;
      }
      setMensaje({
        tipo: "error",
        texto: resultado.mensaje,
        reiniciar: resultado.tipo === "reiniciar",
      });
    } catch {
      setMensaje({ tipo: "error", texto: "Algo ha fallado. Inténtalo de nuevo en unos segundos." });
    }
    setCodigo("");
    setReinicio((r) => r + 1);
    setEnviando(false);
    ocupado.current = false;
  }

  async function reenviar() {
    setReenviando(true);
    setMensaje(null);
    try {
      const resultado = await pedirOtroCodigo();
      if (resultado.ok) {
        setMensaje({
          tipo: "exito",
          texto: "Te hemos enviado un código nuevo. El anterior ya no sirve.",
        });
        setCodigo("");
        setReinicio((r) => r + 1);
      } else {
        setMensaje({ tipo: "error", texto: resultado.mensaje });
      }
      if (resultado.espera) setEspera(resultado.espera);
    } catch {
      setMensaje({ tipo: "error", texto: "Algo ha fallado. Inténtalo de nuevo en unos segundos." });
    }
    setReenviando(false);
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (codigo.length !== 6) {
      setMensaje({ tipo: "error", texto: "Escribe las 6 cifras del código." });
      return;
    }
    confirmar(codigo);
  }

  const debePedirOtro = mensaje?.tipo === "error" && /Reenviar código/.test(mensaje.texto);

  return (
    <form onSubmit={alEnviar} noValidate className="mt-8 space-y-5">
      {mensaje && (
        <Aviso tipo={mensaje.tipo}>
          {mensaje.texto}
          {mensaje.reiniciar && (
            <>
              {" "}
              <Link href={enlaceReinicio.href} className="font-medium underline underline-offset-4">
                {enlaceReinicio.texto}
              </Link>
            </>
          )}
        </Aviso>
      )}

      <CasillasCodigo
        key={reinicio}
        alCambiar={setCodigo}
        alCompletar={confirmar}
        deshabilitado={enviando}
        conError={mensaje?.tipo === "error"}
        idDescripcion={idDescripcion}
      />

      <Boton type="submit" variante="acento" tamano="lg" disabled={enviando} className="w-full">
        {enviando ? "Comprobando…" : "Confirmar"}
      </Boton>

      <div className="text-center text-sm text-gris">
        <p>¿No te ha llegado? Mira en la carpeta de spam.</p>
        <button
          type="button"
          onClick={reenviar}
          disabled={espera > 0 || reenviando}
          className={cn(
            "mt-2 inline-flex min-h-11 items-center px-2 font-medium underline-offset-4 enabled:hover:underline",
            "disabled:cursor-not-allowed disabled:text-gris-claro",
            debePedirOtro ? "text-acento" : "text-tinta",
          )}
        >
          {reenviando
            ? "Enviando…"
            : espera > 0
              ? `Reenviar código (${espera} s)`
              : "Reenviar código"}
        </button>
      </div>
    </form>
  );
}
