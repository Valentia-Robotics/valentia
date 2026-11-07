"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { CampoAdmin } from "./campos";

/**
 * «Descargar ZIP de bienvenida»: crea tantas tarjetas como se pida (cada una con su propio código) y
 * descarga su ZIP para el láser. Después refresca la página para que se vean las cifras nuevas.
 */
export function DescargaBienvenida({ maximo }: { maximo: number }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setHecho(null);
    try {
      const respuesta = await fetch("/admin/codigos/bienvenida", {
        method: "POST",
        body: new FormData(evento.currentTarget),
      });
      if (!respuesta.ok) {
        setError((await respuesta.text()) || "No se pudo crear el ZIP. Vuelve a probar.");
        return;
      }
      // Descarga del archivo con el nombre que da el servidor
      const nombre =
        respuesta.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "tarjetas-laser-bienvenida.zip";
      const url = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setHecho(`Descargado: ${nombre}`);
      router.refresh();
    } catch {
      setError("No hay conexión con la web. Vuelve a probar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-3">
      {error && <Aviso tipo="error">{error}</Aviso>}
      {hecho && <Aviso tipo="exito">{hecho}</Aviso>}
      <div className="grid gap-3 sm:grid-cols-[9rem_auto] sm:items-start">
        <CampoAdmin
          etiqueta="Cuántas tarjetas"
          name="cantidad"
          inputMode="numeric"
          defaultValue="50"
          ayuda={`De 1 a ${maximo}`}
        />
        <BotonAdmin type="submit" disabled={enviando} className="sm:mt-6">
          <Download aria-hidden="true" className="size-4" />
          {enviando ? "Preparando…" : "Descargar ZIP de bienvenida"}
        </BotonAdmin>
      </div>
    </form>
  );
}
