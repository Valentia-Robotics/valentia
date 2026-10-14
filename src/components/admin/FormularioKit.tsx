"use client";

import { guardarKit } from "@/app/admin/kits/acciones";
import { NIVELES } from "@/lib/validaciones/admin";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { Caja } from "./Caja";
import { CampoImagen } from "./CampoImagen";
import { AreaAdmin, CampoAdmin, CasillaAdmin, SelectorAdmin } from "./campos";
import { ListaEditable } from "./ListaEditable";
import { SelectorPiezas, type PiezaDisponible } from "./SelectorPiezas";
import { useFormulario } from "./useFormulario";

/** Datos de un kit que ya existe (para editarlo) */
export interface KitFormulario {
  id: string;
  slug: string;
  nombre: string;
  eslogan: string;
  descripcion: string;
  precioCentimos: number;
  imagen: string;
  nivel: string;
  edadMinima: number;
  tiempoMontaje: string;
  orden: number;
  destacado: boolean;
  visible: boolean;
  puntosFuertes: string[];
  cursoId: string;
  componentes: { id: string; cantidad: number }[];
}

/** Formulario para crear o editar un kit: datos, foto, curso y piezas de la caja */
export function FormularioKit({
  kit,
  piezas,
  cursos,
}: {
  kit?: KitFormulario;
  piezas: PiezaDisponible[];
  cursos: { id: string; titulo: string }[];
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarKit);
  const k = kit;
  // Primer error de la lista de piezas (falta alguna, cantidad mal…)
  const errorPiezas = Object.entries(estado.errores ?? {}).find(([c]) =>
    c.startsWith("componentes"),
  )?.[1];

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-6">
      {k && <input type="hidden" name="id" value={k.id} />}
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}

      <Caja titulo="Datos del kit">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoAdmin
            etiqueta="Nombre"
            name="nombre"
            defaultValue={k?.nombre}
            error={error("nombre")}
          />
          {k ? (
            <CampoAdmin
              etiqueta="Dirección (slug)"
              value={k.slug}
              disabled
              ayuda={`/kits/${k.slug} · No se puede cambiar: la usan los pedidos y los carritos.`}
            />
          ) : (
            <CampoAdmin
              etiqueta="Dirección (slug)"
              name="slug"
              placeholder="Se crea sola a partir del nombre"
              error={error("slug")}
              ayuda="Opcional. Después no se puede cambiar."
            />
          )}
          <CampoAdmin
            etiqueta="Eslogan"
            name="eslogan"
            defaultValue={k?.eslogan}
            error={error("eslogan")}
            ayuda="Una frase que sale bajo el nombre."
            className="sm:col-span-2"
          />
          <AreaAdmin
            etiqueta="Descripción"
            name="descripcion"
            defaultValue={k?.descripcion}
            error={error("descripcion")}
            rows={5}
            className="sm:col-span-2"
          />
          <CampoAdmin
            etiqueta="Precio (€, IVA incluido)"
            name="precio"
            inputMode="decimal"
            defaultValue={k ? (k.precioCentimos / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="79,90"
            error={error("precio")}
          />
          <SelectorAdmin
            etiqueta="Curso incluido"
            name="cursoId"
            defaultValue={k?.cursoId ?? ""}
            error={error("cursoId")}
            ayuda={
              cursos.length === 0
                ? "No hay cursos libres: crea antes uno en «Cursos»."
                : "Cada curso va con un solo kit. Al activar el código QR, el alumno recibe este curso."
            }
            opciones={[
              { valor: "", texto: "Elige un curso…" },
              ...cursos.map((c) => ({ valor: c.id, texto: c.titulo })),
            ]}
          />
          <SelectorAdmin
            etiqueta="Nivel"
            name="nivel"
            defaultValue={k?.nivel ?? "Principiante"}
            error={error("nivel")}
            opciones={NIVELES.map((n) => ({ valor: n, texto: n }))}
          />
          <CampoAdmin
            etiqueta="Edad mínima"
            name="edadMinima"
            inputMode="numeric"
            defaultValue={k?.edadMinima ?? 10}
            error={error("edadMinima")}
          />
          <CampoAdmin
            etiqueta="Tiempo de montaje"
            name="tiempoMontaje"
            defaultValue={k?.tiempoMontaje}
            placeholder="2 horas"
            error={error("tiempoMontaje")}
          />
          <CampoAdmin
            etiqueta="Orden en la tienda"
            name="orden"
            inputMode="numeric"
            defaultValue={k?.orden ?? 0}
            error={error("orden")}
            ayuda="Los kits se muestran de menor a mayor."
          />
          <div className="sm:col-span-2">
            <CampoImagen actual={k?.imagen} error={error("foto")} />
          </div>
          <CasillaAdmin
            etiqueta="Kit destacado"
            ayuda="Sale el primero en la portada. Solo puede haber uno: al marcarlo, se desmarca el anterior."
            name="destacado"
            defaultChecked={k?.destacado ?? false}
          />
          <CasillaAdmin
            etiqueta="Visible en la tienda"
            ayuda="Si lo desmarcas, deja de venderse. Sus códigos QR siguen funcionando."
            name="visible"
            defaultChecked={k?.visible ?? true}
          />
        </div>
      </Caja>

      <Caja titulo="Puntos fuertes">
        {error("puntosFuertes") && (
          <p className="mb-2 text-xs text-error">{error("puntosFuertes")}</p>
        )}
        <ListaEditable
          inicial={k?.puntosFuertes ?? [""]}
          vacia=""
          maximo={8}
          ordenable
          textoAnadir="Añadir punto fuerte"
          fila={(punto, i) => (
            <CampoAdmin
              etiqueta={`Punto fuerte ${i + 1}`}
              name="puntoFuerte"
              defaultValue={punto}
              error={error(`puntosFuertes.${i}`)}
            />
          )}
        />
      </Caja>

      <Caja titulo="Qué hay en la caja">
        <SelectorPiezas disponibles={piezas} inicial={k?.componentes ?? []} error={errorPiezas} />
      </Caja>

      <div className="flex justify-end gap-2">
        <BotonAdmin href="/admin/kits" variante="secundario">
          Volver
        </BotonAdmin>
        <BotonAdmin type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : k ? "Guardar cambios" : "Crear kit"}
        </BotonAdmin>
      </div>
    </form>
  );
}
