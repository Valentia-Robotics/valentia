"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { iniciarSesion, registrarse, type EstadoCuenta } from "@/app/(auth)/acciones";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { leerLlegada } from "@/components/layout/ApuntarLlegada";
import { Aviso } from "./Aviso";

interface Props {
  modo: "login" | "registro";
  /** A dónde volver después de entrar (ya comprobado en el servidor con rutaSegura) */
  volver: string;
}

/**
 * Formulario para iniciar sesión o crear una cuenta.
 * Si hace falta un código (cuenta nueva o dispositivo nuevo), lleva a /verificar.
 * Si entra directamente, recarga la página de destino para que toda la web vea la sesión.
 */
export function FormularioCuenta({ modo, volver }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<EstadoCuenta>({ ok: false });
  const router = useRouter();
  const esRegistro = modo === "registro";

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    // Al registrarse: cómo llegó a la web (para el panel; ver src/config/llegada.ts)
    if (esRegistro) formulario.set("llegada", leerLlegada());
    setEnviando(true);
    setEstado({ ok: false });

    try {
      const resultado = await (esRegistro ? registrarse(formulario) : iniciarSesion(formulario));
      if (!resultado.ok) {
        setEstado(resultado);
        setEnviando(false);
        return;
      }
      // Si todo va bien, el botón sigue en "Un momento…" hasta cambiar de página
      if (resultado.paso === "verificar") {
        // Hay que escribir el código que acabamos de enviar por email
        router.push(`/verificar?callbackUrl=${encodeURIComponent(volver)}`);
        return;
      }
      // ¡Dentro! Vamos a la página de destino (recargándola)
      window.location.assign(volver);
    } catch {
      setEstado({ ok: false, mensaje: "Algo ha fallado. Inténtalo de nuevo en unos segundos." });
      setEnviando(false);
    }
  }

  const e = estado.errores ?? {};
  const enlaceVolver = `?callbackUrl=${encodeURIComponent(volver)}`;

  return (
    <form onSubmit={alEnviar} noValidate className="mt-8 space-y-5">
      {estado.mensaje && <Aviso>{estado.mensaje}</Aviso>}

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
      {esRegistro && (
        // Sin marcar por defecto: el consentimiento tiene que ser porque sí (RGPD)
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="novedades"
            className="mt-0.5 size-4 shrink-0 accent-acento"
          />
          <span>
            Avisadme por correo cuando saquéis kits nuevos. Pocos correos, y te puedes dar de baja
            cuando quieras.
          </span>
        </label>
      )}
      {!esRegistro && (
        <p className="-mt-2 text-right text-sm">
          <Link href="/recuperar" className="text-acento underline underline-offset-4">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      )}

      <Boton type="submit" variante="acento" tamano="lg" disabled={enviando} className="w-full">
        {enviando ? "Un momento…" : esRegistro ? "Crear mi cuenta" : "Iniciar sesión"}
      </Boton>

      <p className="text-center text-sm text-gris">
        {esRegistro ? "¿Ya tienes cuenta? " : "¿Es tu primera vez? "}
        <Link
          href={`${esRegistro ? "/login" : "/registro"}${enlaceVolver}`}
          className="text-acento underline underline-offset-4"
        >
          {esRegistro ? "Inicia sesión" : "Crea una cuenta gratis"}
        </Link>
      </p>
    </form>
  );
}
