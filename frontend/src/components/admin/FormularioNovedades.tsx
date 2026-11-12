"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { enviarNovedades, enviarPrueba } from "@/app/admin/correos/acciones";
import { Dialogo } from "@/components/ui/Dialogo";
import { parrafosDeTexto } from "@/config/novedades";
import { plantillaNovedades } from "@/lib/correo/plantillas";
import { plural } from "@/lib/utils";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { Caja } from "./Caja";
import { AreaAdmin, CampoAdmin, SelectorAdmin } from "./campos";
import { useFormulario } from "./useFormulario";

interface Props {
  /** Cuántas personas lo recibirán */
  destinatarios: number;
  /** Para el botón: «Ver el kit» de cada kit visible */
  kits: { slug: string; nombre: string }[];
  /** Quien escribe (la vista previa sale con su nombre) */
  nombre: string;
}

/**
 * Escribir un correo de novedades: asunto, título, texto y un botón opcional.
 * A la derecha, la vista previa tal cual llegará (misma plantilla que el servidor).
 */
export function FormularioNovedades({ destinatarios, kits, nombre }: Props) {
  const envio = useFormulario(enviarNovedades);
  const prueba = useFormulario(enviarPrueba);
  const [confirmar, setConfirmar] = useState(false);
  const [campos, setCampos] = useState({
    asunto: "",
    titulo: "",
    texto: "",
    botonTexto: "",
    botonUrl: "",
  });
  const cambiar = (campo: keyof typeof campos) => (e: { target: { value: string } }) =>
    setCampos((c) => ({ ...c, [campo]: e.target.value }));

  // Elegir un kit rellena el botón (se puede cambiar después)
  const elegirKit = (slug: string) => {
    if (!slug) return;
    setCampos((c) => ({
      ...c,
      botonTexto: c.botonTexto || "Ver el kit",
      botonUrl: `/kits/${slug}`,
    }));
  };

  const vista = useMemo(
    () =>
      plantillaNovedades({
        para: "",
        nombre,
        asunto: campos.asunto,
        titulo: campos.titulo || "El título de tu correo",
        parrafos: parrafosDeTexto(campos.texto || "Aquí saldrá el texto que escribas."),
        boton:
          campos.botonTexto && campos.botonUrl
            ? { texto: campos.botonTexto, url: campos.botonUrl }
            : undefined,
        urlBaja: "#",
      }).html,
    [campos, nombre],
  );

  // Los errores salen del último botón pulsado
  const ultimo = envio.estado.errores ? envio : prueba;
  const error = (campo: string) => ultimo.error(campo);
  const datos = () => {
    const f = new FormData();
    for (const [clave, valor] of Object.entries(campos)) f.set(clave, valor);
    return f;
  };
  const conDatos = (alEnviar: typeof envio.alEnviar) => (e: React.FormEvent<HTMLFormElement>) => {
    // Los campos están fuera de estos formularios pequeños: los añadimos a mano
    const form = e.currentTarget;
    for (const [clave, valor] of datos()) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = clave;
      input.value = String(valor);
      form.append(input);
    }
    alEnviar(e);
    form.querySelectorAll("input[type=hidden]").forEach((i) => i.remove());
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Caja titulo="Escribe el correo">
        <div className="space-y-4">
          {envio.estado.mensaje && (
            <Aviso tipo={envio.estado.ok ? "exito" : "error"}>{envio.estado.mensaje}</Aviso>
          )}
          {prueba.estado.mensaje && (
            <Aviso tipo={prueba.estado.ok ? "exito" : "error"}>{prueba.estado.mensaje}</Aviso>
          )}
          <CampoAdmin
            etiqueta="Asunto"
            ayuda="Lo que se ve en la bandeja de entrada. Mejor corto y claro: «Ya está aquí el brazo robótico»."
            value={campos.asunto}
            onChange={cambiar("asunto")}
            maxLength={120}
            error={error("asunto")}
          />
          <CampoAdmin
            etiqueta="Título"
            ayuda="La frase grande de arriba del correo."
            value={campos.titulo}
            onChange={cambiar("titulo")}
            maxLength={120}
            error={error("titulo")}
          />
          <AreaAdmin
            etiqueta="Texto"
            ayuda="Escribe como hablarías a un amigo. Deja una línea en blanco para empezar otro párrafo. El «Hola, …» se pone solo."
            rows={9}
            value={campos.texto}
            onChange={cambiar("texto")}
            maxLength={5000}
            error={error("texto")}
          />
          <fieldset className="space-y-3 rounded-md border border-linea p-3">
            <legend className="px-1 text-sm font-medium">Botón (opcional)</legend>
            {kits.length > 0 && (
              <SelectorAdmin
                etiqueta="Llevar a un kit"
                opciones={[
                  { valor: "", texto: "Elige un kit…" },
                  ...kits.map((k) => ({ valor: k.slug, texto: k.nombre })),
                ]}
                defaultValue=""
                onChange={(e) => elegirKit(e.target.value)}
              />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoAdmin
                etiqueta="Texto del botón"
                placeholder="Ver el kit"
                value={campos.botonTexto}
                onChange={cambiar("botonTexto")}
                maxLength={40}
                error={error("botonTexto")}
              />
              <CampoAdmin
                etiqueta="A dónde lleva"
                placeholder="/kits/…"
                value={campos.botonUrl}
                onChange={cambiar("botonUrl")}
                error={error("botonUrl")}
              />
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2 pt-2">
            <form onSubmit={conDatos(prueba.alEnviar)}>
              <BotonAdmin type="submit" variante="secundario" disabled={prueba.enviando}>
                {prueba.enviando ? "Mandando…" : "Mandarme una prueba"}
              </BotonAdmin>
            </form>
            <BotonAdmin
              onClick={() => setConfirmar(true)}
              disabled={destinatarios === 0 || envio.enviando}
            >
              <Send aria-hidden="true" className="size-4" />
              Enviar a {plural(destinatarios, "persona", "personas")}
            </BotonAdmin>
          </div>
          {destinatarios === 0 && (
            <p className="text-sm text-gris">
              Todavía no hay nadie que haya pedido recibir novedades. Puedes ir preparando el correo
              y mandarte una prueba.
            </p>
          )}
        </div>
      </Caja>

      <Caja titulo="Así lo verán" sinRelleno>
        <iframe
          title="Vista previa del correo"
          srcDoc={vista}
          sandbox=""
          className="h-[640px] w-full rounded-b-md bg-niebla"
        />
      </Caja>

      <Dialogo
        abierto={confirmar}
        alCerrar={() => setConfirmar(false)}
        titulo="¿Lo enviamos ya?"
        className="max-w-md"
      >
        <div className="p-5 text-sm">
          <p>
            Le llegará a {plural(destinatarios, "persona", "personas")}. Una vez enviado no se puede
            deshacer: si tienes dudas, mándate antes una prueba.
          </p>
          <form
            className="mt-5 flex justify-end gap-2"
            onSubmit={(e) => {
              conDatos(envio.alEnviar)(e);
              setConfirmar(false);
            }}
          >
            <BotonAdmin variante="secundario" onClick={() => setConfirmar(false)}>
              Cancelar
            </BotonAdmin>
            <BotonAdmin type="submit">Sí, enviar</BotonAdmin>
          </form>
        </div>
      </Dialogo>
    </div>
  );
}
