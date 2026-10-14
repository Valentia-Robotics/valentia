import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, Clock } from "lucide-react";
import { BotonImprimir } from "@/components/compra/BotonImprimir";
import { TarjetaActivacion } from "@/components/compra/TarjetaActivacion";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { obtenerPedido, piezasDeLinea } from "@/lib/pedidos";
import { formatearPrecio } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tu pedido",
  robots: { index: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

const formatoFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" });

/**
 * CONFIRMACIÓN DEL PEDIDO: resumen y, por cada kit, su tarjeta de activación con QR
 * tal y como irá impresa en la caja.
 */
export default async function PaginaPedido({ params }: Props) {
  const { id } = await params;
  const pedido = await obtenerPedido(id);
  if (!pedido) notFound();

  const pagado = pedido.estado === "PAGADO";
  const nombrePila = pedido.nombre.split(" ")[0];

  return (
    <Contenedor className="py-12 sm:py-16">
      {/* ---------- Cabecera (no se imprime) ---------- */}
      <header className="max-w-2xl print:hidden">
        {pagado ? (
          <CircleCheck aria-hidden="true" className="size-12 text-exito" strokeWidth={1.5} />
        ) : (
          <Clock aria-hidden="true" className="size-12 text-aviso" strokeWidth={1.5} />
        )}
        <h1 className="mt-4 text-4xl font-medium sm:text-5xl">
          {pagado ? `¡Gracias, ${nombrePila}!` : "Tu pedido está pendiente de pago"}
        </h1>
        <p className="mt-3 text-lg text-gris">
          {pagado
            ? "Tu pedido está confirmado. Ya estamos preparando la caja para enviártela."
            : pedido.estado === "CANCELADO"
              ? "Este pedido se canceló porque el pago no se completó."
              : "En cuanto recibamos el pago, aparecerán aquí los códigos de tus kits."}
        </p>
        <p className="mt-4 text-sm">
          Pedido <strong className="font-mono">{pedido.numero}</strong> ·{" "}
          {formatoFecha.format(pedido.creadoEn)}
        </p>
      </header>

      {/* ---------- Tarjetas de activación (lo único que se imprime) ---------- */}
      {pedido.codigos.length > 0 && (
        <section aria-labelledby="titulo-tarjetas" className="mt-12 print:mt-0">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end print:hidden">
            <div className="max-w-xl">
              <h2 id="titulo-tarjetas" className="text-3xl font-medium">
                Tus tarjetas de activación
              </h2>
              <p className="mt-2 text-gris">
                Cada kit lleva en la caja una tarjeta como esta. Al escanear el QR, el curso queda
                guardado en «Mis cursos». Cada código solo se puede usar una vez.
              </p>
            </div>
            <BotonImprimir
              texto={pedido.codigos.length === 1 ? "Imprimir tarjeta" : "Imprimir tarjetas"}
            />
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 print:mt-0 print:grid-cols-2">
            {pedido.codigos.map((c) => (
              <TarjetaActivacion key={c.id} codigo={c.codigo} nombreKit={c.kit.nombre} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Resumen (no se imprime) ---------- */}
      <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_22rem] print:hidden">
        <section aria-labelledby="titulo-resumen">
          <h2 id="titulo-resumen" className="text-2xl font-medium">
            Lo que has pedido
          </h2>
          <ul className="mt-4 divide-y divide-linea border-y border-linea">
            {pedido.lineas.map((linea) => (
              <li key={linea.id} className="flex justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {linea.cantidad > 1 && `${linea.cantidad} × `}
                    {linea.nombre}
                  </p>
                  <p className="text-sm text-gris">
                    {linea.tipo === "KIT"
                      ? "Kit · incluye curso y código de activación"
                      : linea.tipo === "COMPONENTE"
                        ? "Componente"
                        : `Robot personalizado: ${piezasDeLinea(linea.piezas)
                            .map((p) => `${p.cantidad} × ${p.nombre}`)
                            .join(", ")}`}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums">
                  {formatearPrecio(linea.precioUnitarioCentimos * linea.cantidad)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between text-lg">
            <span>Total pagado</span>
            <strong className="font-titulo text-2xl font-medium tabular-nums">
              {formatearPrecio(pedido.totalCentimos)}
            </strong>
          </p>
          <p className="text-right text-xs text-gris">
            IVA incluido · Envío gratis
            {pedido.proveedorPago === "simulado" && " · Pago simulado"}
          </p>
        </section>

        <aside className="self-start rounded-tarjeta bg-niebla p-6 text-sm">
          <h2 className="font-sans text-base font-medium">Envío a</h2>
          <p className="mt-2 leading-relaxed text-gris">
            {pedido.nombre}
            <br />
            {pedido.direccion}
            <br />
            {pedido.codigoPostal} {pedido.ciudad}
          </p>
          <p className="mt-4 text-gris">Email de contacto: {pedido.email}</p>
          <Boton href="/kits" variante="acento" tamano="lg" className="mt-6 w-full">
            Seguir explorando
          </Boton>
        </aside>
      </div>
    </Contenedor>
  );
}
