"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { guardarStock } from "@/app/stock/acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { CampoAdmin, CasillaAdmin } from "@/components/admin/campos";
import { useFormulario } from "@/components/admin/useFormulario";
import { Dialogo } from "@/components/ui/Dialogo";
import { MINIMO_POR_DEFECTO, type TipoProducto } from "@/config/stock";

interface Props {
  tipo: TipoProducto;
  id: string;
  nombre: string;
  unidades: number;
  /** El aviso propio del producto, o null si usa el de siempre */
  minimoPropio: number | null;
  enReposicion: boolean;
}

/** Botón «Cambiar» de cada fila de /stock (solo lo ve un ADMIN) y su ventana */
export function EditarStock(props: Props) {
  const [abierto, setAbierto] = useState(false);
  // La ventana se monta de nuevo cada vez: así el formulario empieza con los datos de ahora
  const [vez, setVez] = useState(0);
  return (
    <>
      <BotonAdmin
        variante="suave"
        pequeno
        onClick={() => {
          setVez((v) => v + 1);
          setAbierto(true);
        }}
        aria-label={`Cambiar el stock de ${props.nombre}`}
      >
        <Pencil aria-hidden="true" className="size-3.5" />
        Cambiar
      </BotonAdmin>
      <Dialogo
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={props.nombre}
        className="max-w-md"
      >
        {abierto && <Formulario key={vez} {...props} alTerminar={() => setAbierto(false)} />}
      </Dialogo>
    </>
  );
}

function Formulario({
  tipo,
  id,
  unidades,
  minimoPropio,
  enReposicion,
  alTerminar,
}: Props & { alTerminar: () => void }) {
  const { estado, alEnviar, enviando, error } = useFormulario(guardarStock);
  useEffect(() => {
    if (estado.ok) alTerminar();
  }, [estado, alTerminar]);
  const deSiempre = MINIMO_POR_DEFECTO[tipo];

  return (
    <form onSubmit={alEnviar} className="space-y-4 p-5">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="productoId" value={id} />
      {estado.mensaje && !estado.ok && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <CampoAdmin
        etiqueta="Unidades en el almacén"
        name="unidades"
        type="number"
        inputMode="numeric"
        min={0}
        required
        defaultValue={unidades}
        error={error("unidades")}
        ayuda={
          tipo === "kit"
            ? "Kits montados y en su caja, listos para enviar. Cada venta resta uno solo."
            : "Cada venta (suelto o en un robot del configurador) resta las suyas sola."
        }
      />
      <CampoAdmin
        etiqueta="Avisar cuando queden"
        name="minimo"
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={String(deSiempre)}
        defaultValue={minimoPropio ?? ""}
        error={error("minimo")}
        ayuda={`Con esa cantidad o menos, sale «Stock bajo». Vacío = ${deSiempre}, el aviso de siempre.`}
      />
      <CasillaAdmin
        etiqueta="Ya hemos pedido más"
        name="enReposicion"
        defaultChecked={enReposicion}
        ayuda="Con 0 unidades, la tienda dirá «En reposición» en vez de «Sin stock». Se quita sola cuando vuelve a haber de sobra."
      />
      <div className="flex justify-end gap-2 pt-1">
        <BotonAdmin variante="secundario" onClick={alTerminar}>
          Cancelar
        </BotonAdmin>
        <BotonAdmin type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </BotonAdmin>
      </div>
    </form>
  );
}
