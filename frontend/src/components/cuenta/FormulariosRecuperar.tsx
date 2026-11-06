"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import {
  guardarContrasenaNueva,
  pedirCodigoRecuperacion,
  type EstadoContrasenaNueva,
} from "@/app/(auth)/recuperar/acciones";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "./Aviso";

/** Envía el formulario a la acción sin vaciarlo (si hay un error, lo escrito sigue ahí) */
function enviarCon(despachar: (datos: FormData) => void) {
  return (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => despachar(datos));
  };
}

/** Paso 1: escribir el email al que enviar el código */
export function FormularioPedirCodigo() {
  const [estado, despachar, enviando] = useActionState(pedirCodigoRecuperacion, { ok: false });
  const router = useRouter();

  // Código enviado (o señuelo): a escribirlo
  useEffect(() => {
    if (estado.ok) router.push("/verificar");
  }, [estado, router]);

  return (
    <form onSubmit={enviarCon(despachar)} noValidate className="mt-8 space-y-5">
      {estado.mensaje && <Aviso>{estado.mensaje}</Aviso>}
      <Campo
        etiqueta="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={estado.errores?.email}
      />
      <Boton
        type="submit"
        variante="acento"
        tamano="lg"
        disabled={enviando || estado.ok}
        className="w-full"
      >
        {enviando || estado.ok ? "Un momento…" : "Enviarme un código"}
      </Boton>
    </form>
  );
}

/** Paso 3: elegir la contraseña nueva (después de escribir bien el código) */
export function FormularioContrasenaNueva() {
  const [estado, setEstado] = useState<EstadoContrasenaNueva>({ ok: false });
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setEnviando(true);
    try {
      const resultado = await guardarContrasenaNueva(estado, datos);
      setEstado(resultado);
      if (resultado.ok && resultado.destino) {
        // ¡Hecho! Recargamos en el destino para que toda la web vea la sesión.
        // (Aquí y no en un useEffect: al cambiar las cookies, esta página se vuelve a dibujar)
        window.location.assign(resultado.destino);
        return;
      }
    } catch {
      setEstado({ ok: false, mensaje: "Algo ha fallado. Inténtalo de nuevo en unos segundos." });
    }
    setEnviando(false);
  }

  return (
    <form onSubmit={alEnviar} noValidate className="mt-8 space-y-5">
      {estado.mensaje && <Aviso>{estado.mensaje}</Aviso>}
      <Campo
        etiqueta="Contraseña nueva"
        name="nueva"
        type="password"
        autoComplete="new-password"
        autoFocus
        required
        error={estado.errores?.nueva}
        ayuda="Al menos 8 caracteres."
      />
      <Boton type="submit" variante="acento" tamano="lg" disabled={enviando} className="w-full">
        {enviando ? "Guardando…" : "Guardar y entrar"}
      </Boton>
    </form>
  );
}
