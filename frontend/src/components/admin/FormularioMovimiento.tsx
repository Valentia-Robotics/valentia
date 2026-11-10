"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { guardarMovimiento } from "@/app/admin/finanzas/acciones";
import {
  categoriasDe,
  diaEnEspana,
  ivaIncluido,
  TIPOS_IVA,
  type TipoMovimiento,
} from "@/config/finanzas";
import { cn, formatearPrecio } from "@/lib/utils";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { AreaAdmin, CampoAdmin, SelectorAdmin } from "./campos";
import { useFormulario } from "./useFormulario";

export interface MovimientoEditable {
  id: string;
  tipo: TipoMovimiento;
  concepto: string;
  categoria: string;
  importeCentimos: number;
  ivaPorcentaje: number;
  /** "2026-11-10" */
  dia: string;
  contraparte: string;
  notas: string;
}

/** "2490" céntimos → "24,90" (como se escribe en el campo) */
const eurosEnCampo = (centimos: number) => (centimos / 100).toFixed(2).replace(".", ",");

/** Leer lo que hay escrito en el importe para enseñar el IVA al momento (0 si no se entiende) */
function centimosEscritos(valor: string): number {
  const limpio = valor.includes(",") ? valor.replaceAll(".", "").replace(",", ".") : valor;
  const euros = Number(limpio);
  return Number.isFinite(euros) && euros > 0 ? Math.round(euros * 100) : 0;
}

/** Apuntar o cambiar un ingreso o un gasto */
export function FormularioMovimiento({
  movimiento,
  tipoInicial = "GASTO",
}: {
  movimiento?: MovimientoEditable;
  tipoInicial?: TipoMovimiento;
}) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarMovimiento);
  const [tipo, setTipo] = useState<TipoMovimiento>(movimiento?.tipo ?? tipoInicial);
  const [importe, setImporte] = useState(
    movimiento ? eurosEnCampo(movimiento.importeCentimos) : "",
  );
  const [iva, setIva] = useState(String(movimiento?.ivaPorcentaje ?? TIPOS_IVA[0]));
  const categorias = categoriasDe(tipo);
  const centimos = centimosEscritos(importe);
  const ivaDentro = ivaIncluido(centimos, Number(iva));

  return (
    <form onSubmit={alEnviar} noValidate className="max-w-2xl space-y-5">
      {movimiento && <input type="hidden" name="movimientoId" value={movimiento.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      {!estado.ok && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <fieldset>
        <legend className="text-[13px] font-medium">¿Entra o sale dinero?</legend>
        <div className="mt-1 inline-flex rounded-md bg-niebla p-1" role="radiogroup">
          {(["GASTO", "INGRESO"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              onClick={() => setTipo(t)}
              className={cn(
                "rounded px-4 py-1.5 text-sm font-medium transition-colors",
                tipo === t ? "bg-white text-tinta shadow-sm" : "text-gris hover:text-tinta",
              )}
            >
              {t === "GASTO" ? "Gasto" : "Ingreso"}
            </button>
          ))}
        </div>
      </fieldset>

      <CampoAdmin
        etiqueta="Concepto"
        name="concepto"
        defaultValue={movimiento?.concepto}
        maxLength={120}
        placeholder={
          tipo === "GASTO"
            ? "Por ejemplo: 50 motores TT para el kit del coche"
            : "Por ejemplo: taller en el colegio San José"
        }
        error={error("concepto")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectorAdmin
          // key: al cambiar de gasto a ingreso, la lista empieza de nuevo
          key={tipo}
          etiqueta="Categoría"
          name="categoria"
          defaultValue={movimiento?.tipo === tipo ? movimiento.categoria : ""}
          error={error("categoria")}
          opciones={[
            { valor: "", texto: "Elige una categoría…" },
            ...categorias.map((c) => ({ valor: c.slug, texto: c.nombre })),
          ]}
        />
        <CampoAdmin
          etiqueta="Fecha"
          name="fecha"
          type="date"
          defaultValue={movimiento?.dia ?? diaEnEspana()}
          error={error("fecha")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoAdmin
          etiqueta="Importe total (€, IVA incluido)"
          name="importe"
          inputMode="decimal"
          placeholder="0,00"
          value={importe}
          onChange={(e) => setImporte(e.target.value)}
          error={error("importe")}
          ayuda="Lo que pone la factura o el ticket, con el IVA."
        />
        <SelectorAdmin
          etiqueta="IVA"
          name="iva"
          value={iva}
          onChange={(e) => setIva(e.target.value)}
          error={error("iva")}
          ayuda={
            centimos > 0
              ? Number(iva) > 0
                ? `Lleva ${formatearPrecio(ivaDentro)} de IVA (${formatearPrecio(centimos - ivaDentro)} sin IVA).`
                : "Sin IVA (por ejemplo, una subvención o una compra fuera de la UE)."
              : "Lo normal en España es el 21 %."
          }
          opciones={TIPOS_IVA.map((p) => ({
            valor: String(p),
            texto: p === 0 ? "Sin IVA (0 %)" : `${p} %`,
          }))}
        />
      </div>

      <CampoAdmin
        etiqueta={tipo === "GASTO" ? "Proveedor (opcional)" : "Cliente (opcional)"}
        name="contraparte"
        defaultValue={movimiento?.contraparte}
        maxLength={80}
        placeholder={tipo === "GASTO" ? "Por ejemplo: AliExpress, Amazon, Correos…" : ""}
        error={error("contraparte")}
      />

      <AreaAdmin
        etiqueta="Notas (opcional)"
        name="notas"
        defaultValue={movimiento?.notas}
        maxLength={500}
        rows={3}
        placeholder="Número de factura, para qué fue, cualquier detalle…"
        error={error("notas")}
      />

      <div className="flex flex-wrap gap-2">
        <BotonAdmin type="submit" disabled={enviando}>
          <Save aria-hidden="true" className="size-4" />
          {enviando
            ? "Guardando…"
            : movimiento
              ? "Guardar cambios"
              : `Apuntar ${tipo === "GASTO" ? "gasto" : "ingreso"}`}
        </BotonAdmin>
        <BotonAdmin href="/admin/finanzas" variante="secundario">
          Cancelar
        </BotonAdmin>
      </div>
    </form>
  );
}
