"use client";

import { useEffect, useRef } from "react";
import { cambiarContrasena } from "@/app/(cuenta)/cuenta/acciones";
import { useFormulario } from "@/components/admin/useFormulario";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "./Aviso";

/** Cambiar la contraseña desde "Mi cuenta": hay que escribir la actual y la nueva */
export function FormularioContrasena() {
  const { estado, alEnviar, enviando, error } = useFormulario(cambiarContrasena);
  const formulario = useRef<HTMLFormElement>(null);

  // Si ha ido bien, vaciamos los campos (las contraseñas no deben quedarse escritas)
  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} onSubmit={alEnviar} noValidate className="max-w-md space-y-5">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      <Campo
        etiqueta="Contraseña actual"
        name="actual"
        type="password"
        autoComplete="current-password"
        required
        error={error("actual")}
      />
      <Campo
        etiqueta="Contraseña nueva"
        name="nueva"
        type="password"
        autoComplete="new-password"
        required
        error={error("nueva")}
        ayuda="Al menos 8 caracteres. Se cerrará la sesión en tus otros dispositivos."
      />
      <Boton type="submit" variante="primario" tamano="lg" disabled={enviando}>
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </Boton>
    </form>
  );
}
