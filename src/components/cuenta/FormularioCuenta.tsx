"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { registrarse, type EstadoRegistro } from "@/app/(auth)/acciones";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";

interface Props {
  modo: "login" | "registro";
  /** A dónde volver después de entrar (ya comprobado en el servidor con rutaSegura) */
  volver: string;
}

/**
 * Formulario para iniciar sesión o crear una cuenta.
 * Al terminar recarga la página de destino para que toda la web vea la sesión nueva.
 */
export function FormularioCuenta({ modo, volver }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<EstadoRegistro>({ ok: false });
  const esRegistro = modo === "registro";

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    setEnviando(true);
    setEstado({ ok: false });

    try {
      // 1. Si es un registro, primero creamos la cuenta en el servidor
      if (esRegistro) {
        const resultado = await registrarse(formulario);
        if (!resultado.ok) {
          setEstado(resultado);
          return;
        }
      }

      // 2. Iniciamos sesión con Auth.js
      const respuesta = await signIn("credentials", {
        email: formulario.get("email"),
        contrasena: formulario.get("contrasena"),
        redirect: false,
      });
      if (!respuesta || respuesta.error) {
        setEstado({ ok: false, mensaje: "El email o la contraseña no son correctos." });
        return;
      }

      // 3. ¡Dentro! Vamos a la página de destino (recargándola)
      window.location.assign(volver);
    } catch {
      setEstado({ ok: false, mensaje: "Algo ha fallado. Inténtalo de nuevo en unos segundos." });
    } finally {
      setEnviando(false);
    }
  }

  const e = estado.errores ?? {};
  const enlaceVolver = `?callbackUrl=${encodeURIComponent(volver)}`;

  return (
    <form onSubmit={alEnviar} noValidate className="mt-8 space-y-5">
      {estado.mensaje && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-control bg-error/8 p-4 text-sm text-error"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {estado.mensaje}
        </p>
      )}

      {esRegistro && (
        <Campo
          etiqueta="Nombre"
          name="nombre"
          autoComplete="given-name"
          required
          error={e.nombre}
        />
      )}
      <Campo
        etiqueta="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={e.email}
      />
      <Campo
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete={esRegistro ? "new-password" : "current-password"}
        required
        error={e.contrasena}
        ayuda={esRegistro ? "Al menos 8 caracteres." : undefined}
      />

      <Boton type="submit" variante="acento" tamano="lg" disabled={enviando} className="w-full">
        {enviando ? "Un momento…" : esRegistro ? "Crear mi cuenta" : "Iniciar sesión"}
      </Boton>

      <p className="text-center text-sm text-gris">
        {esRegistro ? "¿Ya tienes cuenta? " : "¿Es tu primera vez? "}
        <Link
          href={`${esRegistro ? "/login" : "/registro"}${enlaceVolver}`}
          className="text-acento hover:underline"
        >
          {esRegistro ? "Inicia sesión" : "Crea una cuenta gratis"}
        </Link>
      </p>
    </form>
  );
}
