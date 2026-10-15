import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Mail, RefreshCw, Trash2 } from "lucide-react";
import { Logo } from "@/components/marca/Logo";
import { leerCorreosGuardados } from "@/lib/correo/consola";
import { vaciarBandeja } from "./acciones";

export const metadata: Metadata = { title: "Correos de prueba", robots: { index: false } };

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Europe/Madrid",
});

/**
 * BANDEJA DE CORREOS DE PRUEBA (/dev/correos)
 * Solo existe con "npm run dev": en producción es una página 404.
 * Aquí se ven, con su diseño, los correos que la web "habría enviado" (ver src/lib/correo).
 */
export default async function PaginaCorreos() {
  await connection(); // se lee en cada visita, nunca se guarda una copia fija
  if (process.env.NODE_ENV !== "development") notFound();

  const correos = await leerCorreosGuardados();

  return (
    <main className="min-h-dvh bg-niebla px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Logo alto={14} />
            <h1 className="mt-4 text-2xl font-medium">Correos de prueba</h1>
            <p className="mt-1 text-sm text-gris">
              Solo en desarrollo. Ningún correo sale de verdad: se guardan aquí y en la terminal.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/dev/correos"
              className="inline-flex h-10 items-center gap-2 rounded-boton bg-white px-4 text-sm ring-1 ring-linea hover:bg-white/60"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Actualizar
            </a>
            {correos.length > 0 && (
              <form action={vaciarBandeja}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-boton bg-white px-4 text-sm text-error ring-1 ring-linea hover:bg-white/60"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Vaciar
                </button>
              </form>
            )}
          </div>
        </div>

        {correos.length === 0 ? (
          <p className="mt-10 flex flex-col items-center gap-3 rounded-tarjeta bg-white p-10 text-center text-gris shadow-tarjeta">
            <Mail aria-hidden="true" className="size-8" />
            Todavía no hay correos. Regístrate o inicia sesión y aparecerán aquí.
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {correos.map((correo, indice) => (
              <li key={correo.id}>
                {/* El más reciente se ve abierto */}
                <details
                  open={indice === 0}
                  className="group rounded-tarjeta bg-white shadow-tarjeta"
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-5">
                    <span className="min-w-0">
                      <span className="block font-medium">{correo.asunto}</span>
                      <span className="block truncate text-sm text-gris">Para: {correo.para}</span>
                    </span>
                    <time dateTime={correo.enviadoEn} className="text-xs text-gris">
                      {formatoFecha.format(new Date(correo.enviadoEn))}
                    </time>
                  </summary>
                  {/* sandbox: el correo se muestra aislado, sin poder ejecutar nada */}
                  <iframe
                    title={`Correo: ${correo.asunto}`}
                    srcDoc={correo.html}
                    sandbox=""
                    className="h-[640px] w-full rounded-b-tarjeta border-t border-linea"
                  />
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
