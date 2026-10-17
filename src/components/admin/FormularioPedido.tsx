"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { actualizarPedido } from "@/app/admin/pedidos/acciones";
import { estadosPedido, transicionesPanel } from "@/config/estadosPedido";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { CampoAdmin, SelectorAdmin } from "./campos";
import { useFormulario } from "./useFormulario";

/** Cambiar el estado de un pedido y su número de seguimiento */
export function FormularioPedido({
  pedidoId,
  estado,
  numeroSeguimiento,
}: {
  pedidoId: string;
  estado: EstadoPedido;
  numeroSeguimiento: string | null;
}) {
  const { estado: respuesta, alEnviar, enviando, error } = useFormulario(actualizarPedido);
  const [elegido, setElegido] = useState<EstadoPedido>(estado);
  const posibles = [estado, ...transicionesPanel[estado]];
  const final = posibles.length === 1;

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-4">
      <input type="hidden" name="pedidoId" value={pedidoId} />
      {respuesta.mensaje && (
        <Aviso tipo={respuesta.ok ? "exito" : "error"}>{respuesta.mensaje}</Aviso>
      )}
      <SelectorAdmin
        etiqueta="Estado"
        name="estado"
        value={elegido}
        onChange={(e) => setElegido(e.target.value as EstadoPedido)}
        disabled={final}
        ayuda={
          estado === "PENDIENTE"
            ? "Pasa a «Pagado» solo cuando se confirma el pago. Desde aquí solo se puede cancelar."
            : final
              ? "Este pedido ya no puede cambiar de estado."
              : undefined
        }
        opciones={posibles.map((e) => ({
          valor: e,
          texto: e === estado ? `${estadosPedido[e].nombre} (actual)` : estadosPedido[e].nombre,
        }))}
      />
      {final && <input type="hidden" name="estado" value={estado} />}
      <CampoAdmin
        etiqueta="Número de seguimiento"
        name="numeroSeguimiento"
        defaultValue={numeroSeguimiento ?? ""}
        error={error("numeroSeguimiento")}
        ayuda="Obligatorio al marcarlo como enviado: se lo enviamos al cliente por email."
        maxLength={60}
      />
      {elegido === "CANCELADO" && elegido !== estado && (
        <Aviso tipo="error">
          Al cancelar se devuelve el stock y se desactivan los códigos de activación sin usar. Si ya
          se había cobrado, devuelve el dinero desde el panel de Stripe.
        </Aviso>
      )}
      <BotonAdmin
        type="submit"
        variante={elegido === "CANCELADO" && elegido !== estado ? "peligro" : "primario"}
        disabled={enviando}
      >
        <Save aria-hidden="true" className="size-4" />
        {enviando ? "Guardando…" : "Guardar cambios"}
      </BotonAdmin>
    </form>
  );
}
