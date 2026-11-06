"use client";

import { guardarComponente } from "@/app/admin/componentes/acciones";
import { categorias } from "@/config/categorias";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { Caja } from "./Caja";
import { CampoImagen } from "./CampoImagen";
import { AreaAdmin, CampoAdmin, CasillaAdmin, SelectorAdmin } from "./campos";
import { ListaEditable } from "./ListaEditable";
import { useFormulario } from "./useFormulario";

/** Datos de un componente que ya existe (para editarlo) */
export interface ComponenteFormulario {
  id: string;
  slug: string;
  nombre: string;
  categoria: string;
  tipo: string;
  resumen: string;
  descripcion: string;
  precioCentimos: number;
  stock: number;
  imagen: string;
  voltaje: number;
  voltajeLogico: number | null;
  consumoMa: number;
  conector: string;
  pines: number;
  especificaciones: { nombre: string; valor: string }[];
  visible: boolean;
}

/** Número con coma decimal para rellenar un campo: 3.3 → "3,3" */
const aTexto = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

/**
 * Formulario para crear o editar un componente.
 * Los datos técnicos (tipo, voltajes, consumo, pines) son los que usan las reglas
 * de compatibilidad del configurador.
 */
export function FormularioComponente({
  componente,
  tipos,
}: {
  componente?: ComponenteFormulario;
  tipos: { tipo: string; enReglas: boolean }[];
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarComponente);
  const c = componente;

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}

      <Caja titulo="Datos para la tienda">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoAdmin
            etiqueta="Nombre"
            name="nombre"
            defaultValue={c?.nombre}
            error={error("nombre")}
            className="sm:col-span-2"
          />
          {c ? (
            <CampoAdmin
              etiqueta="Dirección (slug)"
              value={c.slug}
              disabled
              ayuda="No se puede cambiar: la usan los carritos guardados y las sugerencias del configurador."
            />
          ) : (
            <CampoAdmin
              etiqueta="Dirección (slug)"
              name="slug"
              placeholder="Se crea sola a partir del nombre"
              error={error("slug")}
              ayuda="Opcional. Solo minúsculas, números y guiones. Después no se puede cambiar."
            />
          )}
          <SelectorAdmin
            etiqueta="Categoría"
            name="categoria"
            defaultValue={c?.categoria ?? ""}
            error={error("categoria")}
            opciones={[
              { valor: "", texto: "Elige una categoría…" },
              ...categorias.map((cat) => ({ valor: cat.id, texto: cat.nombre })),
            ]}
          />
          <CampoAdmin
            etiqueta="Resumen"
            name="resumen"
            defaultValue={c?.resumen}
            error={error("resumen")}
            ayuda="Una frase corta que sale en las tarjetas."
            className="sm:col-span-2"
          />
          <AreaAdmin
            etiqueta="Descripción"
            name="descripcion"
            defaultValue={c?.descripcion}
            error={error("descripcion")}
            className="sm:col-span-2"
          />
          <CampoAdmin
            etiqueta="Precio (€, IVA incluido)"
            name="precio"
            inputMode="decimal"
            defaultValue={c ? (c.precioCentimos / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="24,90"
            error={error("precio")}
          />
          <CampoAdmin
            etiqueta="Stock (unidades)"
            name="stock"
            inputMode="numeric"
            defaultValue={c?.stock ?? ""}
            error={error("stock")}
          />
          <div className="sm:col-span-2">
            <CampoImagen actual={c?.imagen} error={error("foto")} />
          </div>
          <CasillaAdmin
            etiqueta="Visible en la tienda y en el configurador"
            ayuda="Si lo desmarcas, deja de venderse suelto, pero sigue dentro de los kits que lo lleven."
            name="visible"
            defaultChecked={c?.visible ?? true}
            className="sm:col-span-2"
          />
        </div>
      </Caja>

      <Caja titulo="Datos técnicos para la compatibilidad">
        <p className="mb-4 text-xs text-gris">
          El configurador usa estos datos para avisar de piezas que no encajan. En una placa,
          «pines» son los que ofrece; en una batería, «voltaje» y «consumo» son los que entrega.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoAdmin
            etiqueta="Tipo de pieza"
            name="tipo"
            list="tipos-de-pieza"
            defaultValue={c?.tipo}
            error={error("tipo")}
            ayuda="Elige uno de la lista para que las reglas lo reconozcan."
          />
          <datalist id="tipos-de-pieza">
            {tipos.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {t.enReglas ? "Lo usan las reglas" : ""}
              </option>
            ))}
          </datalist>
          <CampoAdmin
            etiqueta="Voltaje (V)"
            name="voltaje"
            inputMode="decimal"
            defaultValue={aTexto(c?.voltaje)}
            error={error("voltaje")}
          />
          <CampoAdmin
            etiqueta="Voltaje lógico (V)"
            name="voltajeLogico"
            inputMode="decimal"
            defaultValue={aTexto(c?.voltajeLogico)}
            error={error("voltajeLogico")}
            ayuda="3,3 o 5. Vacío si no tiene señales."
          />
          <CampoAdmin
            etiqueta="Consumo (mA)"
            name="consumoMa"
            inputMode="numeric"
            defaultValue={c?.consumoMa ?? ""}
            error={error("consumoMa")}
          />
          <CampoAdmin
            etiqueta="Pines"
            name="pines"
            inputMode="numeric"
            defaultValue={c?.pines ?? ""}
            error={error("pines")}
          />
          <CampoAdmin
            etiqueta="Conector"
            name="conector"
            defaultValue={c?.conector}
            error={error("conector")}
            placeholder="Dupont, JST…"
          />
        </div>

        <div className="mt-6">
          <p className="text-[13px] font-medium">Otros datos de la ficha</p>
          <p className="mb-2 text-xs text-gris">
            Pares nombre / valor, por ejemplo «Giro» / «0 – 180°».
          </p>
          {error("especificaciones") && (
            <p className="mb-2 text-xs text-error">{error("especificaciones")}</p>
          )}
          <ListaEditable
            inicial={c?.especificaciones ?? []}
            vacia={{ nombre: "", valor: "" }}
            textoAnadir="Añadir dato"
            ordenable
            fila={(e, i) => (
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                <CampoAdmin
                  etiqueta={`Dato ${i + 1}: nombre`}
                  name="espNombre"
                  defaultValue={e.nombre}
                  error={error(`especificaciones.${i}.nombre`)}
                />
                <CampoAdmin
                  etiqueta="Valor"
                  name="espValor"
                  defaultValue={e.valor}
                  error={error(`especificaciones.${i}.valor`)}
                />
              </div>
            )}
          />
        </div>
      </Caja>

      <div className="flex justify-end gap-2">
        <BotonAdmin href="/admin/componentes" variante="secundario">
          Volver
        </BotonAdmin>
        <BotonAdmin type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : c ? "Guardar cambios" : "Crear componente"}
        </BotonAdmin>
      </div>
    </form>
  );
}
