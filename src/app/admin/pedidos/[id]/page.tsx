import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { EstadoPedido } from "@/components/admin/EstadoPedido";
import { FormularioPedido } from "@/components/admin/FormularioPedido";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { tienda } from "@/config/tienda";
import { fechaHora } from "@/lib/admin/formato";
import { obtenerPedidoAdmin } from "@/lib/admin/pedidos";
import { piezasDeLinea } from "@/lib/pedidos";
import { exigirAdmin } from "@/lib/sesion";
import { formatearPrecio } from "@/lib/utils";
import { formatearTelefono } from "@/lib/validaciones/pedido";

export const metadata: Metadata = { title: "Pedido" };

interface Props {
  params: Promise<{ id: string }>;
}

/** FICHA DE UN PEDIDO: lo que se ha pedido, a quién se envía, el pago y su estado */
export default async function PedidoAdmin({ params }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/pedidos/${id}`);
  const pedido = await obtenerPedidoAdmin(id);
  if (!pedido) notFound();

  const momentos = [
    ["Creado", pedido.creadoEn],
    ["Pagado", pedido.pagadoEn],
    ["Enviado", pedido.enviadoEn],
    ["Entregado", pedido.entregadoEn],
    ["Cancelado", pedido.canceladoEn],
  ] as const;

  return (
    <>
      <Cabecera
        titulo={`Pedido ${pedido.numero}`}
        descripcion={<EstadoPedido estado={pedido.estado} />}
        volver={{ href: "/admin/pedidos", etiqueta: "Pedidos" }}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-6">
          <Caja titulo="Artículos" sinRelleno>
            <Tabla columnas={["Artículo", "Cantidad", "Precio", "Importe"]}>
              {pedido.lineas.map((l) => (
                <tr key={l.id}>
                  <td>
                    <p className="font-medium">{l.nombre}</p>
                    <p className="text-xs text-gris">
                      {l.tipo === "KIT"
                        ? "Kit"
                        : l.tipo === "COMPONENTE"
                          ? "Componente"
                          : piezasDeLinea(l.piezas)
                              .map((p) => `${p.cantidad} × ${p.nombre}`)
                              .join(", ")}
                    </p>
                  </td>
                  <td className="tabular-nums">{l.cantidad}</td>
                  <td className="tabular-nums">{formatearPrecio(l.precioUnitarioCentimos)}</td>
                  <td className="tabular-nums">
                    {formatearPrecio(l.precioUnitarioCentimos * l.cantidad)}
                  </td>
                </tr>
              ))}
            </Tabla>
            <dl className="space-y-1 border-t border-linea px-4 py-3 text-sm">
              <Fila nombre="Subtotal" valor={formatearPrecio(pedido.subtotalCentimos)} />
              <Fila
                nombre="Envío"
                valor={pedido.envioCentimos ? formatearPrecio(pedido.envioCentimos) : "Gratis"}
              />
              <Fila nombre="Total" valor={formatearPrecio(pedido.totalCentimos)} fuerte />
              <Fila
                nombre={`IVA incluido (${tienda.ivaPorcentaje} %)`}
                valor={formatearPrecio(pedido.ivaCentimos)}
              />
            </dl>
          </Caja>

          {pedido.codigos.length > 0 && (
            <Caja titulo="Códigos de activación" sinRelleno>
              <Tabla columnas={["Código", "Kit", "Estado"]}>
                {pedido.codigos.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono">{c.codigo}</td>
                    <td>{c.kit.nombre}</td>
                    <td>
                      {c.desactivadoEn ? (
                        <Insignia tono="error">Desactivado</Insignia>
                      ) : c.usadoEn ? (
                        <Insignia tono="exito">Usado</Insignia>
                      ) : (
                        <Insignia>Sin usar</Insignia>
                      )}
                    </td>
                  </tr>
                ))}
              </Tabla>
            </Caja>
          )}

          <Caja titulo="Envío">
            <p className="text-sm leading-relaxed">
              {pedido.nombre}
              <br />
              {pedido.direccion}
              <br />
              {pedido.codigoPostal} {pedido.ciudad} {pedido.provincia && `(${pedido.provincia})`}
              <br />
              {pedido.telefono && `Tel. ${formatearTelefono(pedido.telefono)} · `}
              {pedido.email}
            </p>
            <p className="mt-3 text-xs text-gris">
              {pedido.usuario ? (
                <>Compra con la cuenta de {pedido.usuario.nombre}.</>
              ) : (
                "Compra como invitado."
              )}
            </p>
          </Caja>
        </div>

        <div className="space-y-6">
          <Caja titulo="Estado y seguimiento">
            <FormularioPedido
              pedidoId={pedido.id}
              estado={pedido.estado}
              numeroSeguimiento={pedido.numeroSeguimiento}
            />
          </Caja>
          <Caja titulo="Pago">
            <dl className="space-y-1 text-sm">
              <Fila
                nombre="Forma de pago"
                valor={
                  pedido.proveedorPago === "stripe" ? "Stripe (tarjeta)" : "Prueba (sin cobro)"
                }
              />
              {pedido.referenciaPago && (
                <Fila
                  nombre="Referencia"
                  valor={<span className="font-mono text-xs">{pedido.referenciaPago}</span>}
                />
              )}
              {momentos.map(([nombre, momento]) =>
                momento ? <Fila key={nombre} nombre={nombre} valor={fechaHora(momento)} /> : null,
              )}
            </dl>
            {pedido.proveedorPago === "stripe" && pedido.referenciaPago && (
              <Link
                href={`https://dashboard.stripe.com/test/payments/${pedido.referenciaPago}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-acento hover:underline"
              >
                Ver el pago en Stripe ↗
              </Link>
            )}
          </Caja>
        </div>
      </div>
    </>
  );
}

function Fila({
  nombre,
  valor,
  fuerte,
}: {
  nombre: string;
  valor: React.ReactNode;
  fuerte?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gris">{nombre}</dt>
      <dd className={fuerte ? "font-semibold tabular-nums" : "text-right tabular-nums"}>{valor}</dd>
    </div>
  );
}
