import type { Metadata } from "next";
import { BotonImprimirAdmin } from "@/components/admin/BotonImprimirAdmin";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioEnvios } from "@/components/admin/FormularioEnvios";
import { pedidosPorEnviar } from "@/lib/admin/pedidos";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Por enviar" };

/** POR ENVIAR: los pedidos pagados que faltan por salir, para meter todos los seguimientos de golpe */
export default async function PorEnviar() {
  await exigirAdmin("/admin/pedidos/por-enviar");
  const pedidos = await pedidosPorEnviar();

  return (
    <>
      <Cabecera
        titulo="Por enviar"
        descripcion={`${plural(pedidos.length, "pedido pagado", "pedidos pagados")} pendientes de salir, del más antiguo al más nuevo.`}
        volver={{ href: "/admin/pedidos", etiqueta: "Pedidos" }}
        acciones={pedidos.length > 0 && <BotonImprimirAdmin texto="Imprimir lista" />}
      />
      <Caja sinRelleno>
        <FormularioEnvios pedidos={pedidos} />
      </Caja>
    </>
  );
}
