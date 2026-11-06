import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, CircleCheck, CircleX, Clock, Truck } from "lucide-react";
import { BotonImprimir } from "@/components/compra/BotonImprimir";
import { EsperarPago } from "@/components/compra/EsperarPago";
import { TarjetaActivacion } from "@/components/compra/TarjetaActivacion";
import { VaciarCarrito } from "@/components/compra/VaciarCarrito";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { estadosPedido, pasosPedido } from "@/config/estadosPedido";
import { tienda } from "@/config/tienda";
import { obtenerPedido, piezasDeLinea, tokenValido } from "@/lib/pedidos";
import { obtenerUsuario } from "@/lib/sesion";
import { cn, formatearPrecio } from "@/lib/utils";
import { formatearTelefono } from "@/lib/validaciones/pedido";
import { esId } from "@/lib/ids";

export const metadata: Metadata = {
  title: "Tu pedido",
  robots: { index: false, follow: false },
  // El enlace lleva un token privado: que no se envíe a otras webs
  referrer: "no-referrer",
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

/**
 * PÁGINA DE UN PEDIDO: estado, resumen con el IVA desglosado y, por cada kit, su tarjeta de
 * activación con QR tal y como irá impresa en la caja.
 * Solo la ve: quien lo hizo (con su cuenta), un administrador o quien tenga el enlace privado
 * (?t=…, el del correo de confirmación). Si no, "no encontrado".
 */
export default async function PaginaPedido({ params, searchParams }: Props) {
  const { id } = await params;
  // Un id con otra forma no existe (y Prisma daría error con MongoDB)
  if (!esId(id)) notFound();
  const { t, nuevo, redirect_status: estadoStripe } = await searchParams;

  const [pedido, usuario] = await Promise.all([obtenerPedido(id), obtenerUsuario()]);
  if (!pedido) notFound();
  const esSuyo =
    usuario !== null &&
    (pedido.usuarioId === usuario.id ||
      (pedido.usuarioId === null && pedido.email === usuario.email));
  if (!esSuyo && usuario?.rol !== "ADMIN" && !tokenValido(pedido.id, t)) notFound();

  const pagado = pedido.pagadoEn !== null && pedido.estado !== "CANCELADO";
  const pendiente = pedido.estado === "PENDIENTE";
  const pagoFallido = pendiente && estadoStripe === "failed";
  const nombrePila = pedido.nombre.split(" ")[0];
  const estado = estadosPedido[pedido.estado];
  const pasoActual = pasosPedido.indexOf(pedido.estado);

  return (
    <Contenedor className="py-12 sm:py-16">
      {/* Al volver de pagar, el carrito ya no hace falta (salvo si el pago ha fallado) */}
      {nuevo === "1" && !pagoFallido && pedido.estado !== "CANCELADO" && <VaciarCarrito />}

      {/* ---------- Cabecera (no se imprime) ---------- */}
      <header className="max-w-2xl print:hidden">
        {pagado ? (
          <CircleCheck aria-hidden="true" className="size-12 text-exito" strokeWidth={1.5} />
        ) : pedido.estado === "CANCELADO" || pagoFallido ? (
          <CircleX aria-hidden="true" className="size-12 text-error" strokeWidth={1.5} />
        ) : (
          <Clock aria-hidden="true" className="size-12 text-aviso" strokeWidth={1.5} />
        )}
        <h1 className="mt-4 text-4xl font-medium sm:text-5xl">
          {pagado
            ? `¡Gracias, ${nombrePila}!`
            : pagoFallido
              ? "El pago no se ha completado"
              : pendiente
                ? "Estamos confirmando tu pago"
                : "Pedido cancelado"}
        </h1>
        <p className="mt-3 text-lg text-gris">
          {pagado
            ? estado.cliente
            : pagoFallido
              ? "No se te ha cobrado nada. Vuelve al checkout para intentarlo de nuevo."
              : pendiente
                ? "En cuanto el banco lo confirme, aparecerá aquí y te enviaremos un correo."
                : "Este pedido se canceló: el pago no se completó o lo anulamos. No se te ha cobrado nada."}
        </p>
        {pendiente && !pagoFallido && <EsperarPago />}
        {pagoFallido && (
          <Boton href="/checkout" variante="acento" tamano="lg" className="mt-6">
            Volver al checkout
          </Boton>
        )}
        <p className="mt-4 text-sm">
          Pedido <strong className="font-mono">{pedido.numero}</strong> ·{" "}
          {formatoFecha.format(pedido.creadoEn)}
        </p>
      </header>

      {/* ---------- Seguimiento ---------- */}
      {pagado && (
        <section aria-label="Estado del pedido" className="mt-10 max-w-2xl print:hidden">
          <ol className="grid grid-cols-4 gap-2">
            {pasosPedido.map((paso, i) => {
              const hecho = i <= pasoActual;
              return (
                <li key={paso} aria-current={i === pasoActual ? "step" : undefined}>
                  <span
                    className={cn("block h-1.5 rounded-full", hecho ? "bg-exito" : "bg-linea")}
                  />
                  <span
                    className={cn(
                      "mt-2 flex items-center gap-1 text-xs sm:text-sm",
                      hecho ? "font-medium text-tinta" : "text-gris",
                    )}
                  >
                    {hecho && <Check aria-hidden="true" className="size-3.5 text-exito" />}
                    {estadosPedido[paso].nombre}
                  </span>
                </li>
              );
            })}
          </ol>
          {pedido.numeroSeguimiento && (
            <p className="mt-5 flex items-center gap-2 rounded-control bg-niebla p-4 text-sm">
              <Truck aria-hidden="true" className="size-5 text-acento" />
              Número de seguimiento:{" "}
              <strong className="font-mono">{pedido.numeroSeguimiento}</strong>
            </p>
          )}
        </section>
      )}

      {/* ---------- Tarjetas de activación (lo único que se imprime) ---------- */}
      {pagado && pedido.codigos.length > 0 && (
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
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gris">Subtotal</dt>
              <dd className="tabular-nums">{formatearPrecio(pedido.subtotalCentimos)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gris">Envío</dt>
              <dd className="tabular-nums">
                {pedido.envioCentimos === 0 ? "Gratis" : formatearPrecio(pedido.envioCentimos)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between pt-2 text-lg">
              <dt>{pagado ? "Total pagado" : "Total"}</dt>
              <dd className="font-titulo text-2xl font-medium tabular-nums">
                {formatearPrecio(pedido.totalCentimos)}
              </dd>
            </div>
            <div className="flex justify-between text-xs text-gris">
              <dt>Base imponible</dt>
              <dd className="tabular-nums">
                {formatearPrecio(pedido.totalCentimos - pedido.ivaCentimos)}
              </dd>
            </div>
            <div className="flex justify-between text-xs text-gris">
              <dt>IVA incluido ({tienda.ivaPorcentaje} %)</dt>
              <dd className="tabular-nums">{formatearPrecio(pedido.ivaCentimos)}</dd>
            </div>
          </dl>
          {pedido.proveedorPago === "simulado" && (
            <p className="mt-3 text-xs font-medium text-aviso">
              Pedido de prueba: no se ha cobrado.
            </p>
          )}
        </section>

        <aside className="self-start rounded-tarjeta bg-niebla p-6 text-sm">
          <h2 className="font-sans text-base font-medium">Envío a</h2>
          <p className="mt-2 leading-relaxed text-gris">
            {pedido.nombre}
            <br />
            {pedido.direccion}
            <br />
            {pedido.codigoPostal} {pedido.ciudad}
            {pedido.provincia && ` (${pedido.provincia})`}
            {pedido.telefono && (
              <>
                <br />
                Tel. {formatearTelefono(pedido.telefono)}
              </>
            )}
          </p>
          <p className="mt-4 wrap-anywhere text-gris">Email: {pedido.email}</p>
          <Boton href="/kits" variante="acento" tamano="lg" className="mt-6 w-full">
            Seguir explorando
          </Boton>
          {usuario && (
            <Boton href="/cuenta/pedidos" variante="enlace" className="mt-2 w-full">
              Ver todos mis pedidos ›
            </Boton>
          )}
        </aside>
      </div>
    </Contenedor>
  );
}
