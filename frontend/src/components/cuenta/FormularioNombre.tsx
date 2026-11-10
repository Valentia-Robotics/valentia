"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cambiarNombre } from "@/app/(cuenta)/cuenta/acciones";
import { useFormulario } from "@/components/admin/useFormulario";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Aviso } from "./Aviso";

/** Cambiar el nombre desde "Mi cuenta" (sale en el menú, los correos y el diploma) */
export function FormularioNombre({ nombre }: { nombre: string }) {
  const { estado, alEnviar, enviando, error } = useFormulario(cambiarNombre);
  const { update } = useSession();
  const router = useRouter();

  // Si ha ido bien, renovamos la sesión (el menú pasa a mostrar el nombre nuevo) y la página
  useEffect(() => {
    if (!estado.ok) return;
    void update().then(() => router.refresh());
  }, [estado, update, router]);

  return (
    <form onSubmit={alEnviar} noValidate className="max-w-md space-y-5">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      <Campo
        etiqueta="Tu nombre"
        name="nombre"
        autoComplete="name"
        defaultValue={nombre}
        required
        error={error("nombre")}
      />
      <Boton type="submit" variante="primario" tamano="lg" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar nombre"}
      </Boton>
    </form>
  );
}
