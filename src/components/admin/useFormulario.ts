"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { estadoInicial, type EstadoFormulario } from "@/lib/admin/formularios";

type Accion = (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;

/**
 * Conecta un formulario del panel con su acción del servidor.
 * A diferencia de <form action={…}>, NO vacía el formulario al enviarlo:
 * si hay un error, lo que has escrito sigue ahí para corregirlo.
 *
 *   const { estado, alEnviar, enviando, error } = useFormulario(guardarComponente);
 *   <form onSubmit={alEnviar}> … <CampoAdmin error={error("nombre")} /> … </form>
 */
export function useFormulario(accion: Accion) {
  const [estado, despachar, enviando] = useActionState(accion, estadoInicial);

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => despachar(datos));
  };

  return {
    estado,
    alEnviar,
    enviando,
    error: (campo: string) => estado.errores?.[campo],
  };
}
