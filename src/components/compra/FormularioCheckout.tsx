"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CircleAlert, FlaskConical, Lock } from "lucide-react";
import { useActionState, useEffect } from "react";
import { realizarPedido, type EstadoCheckout } from "@/app/(tienda)/checkout/acciones";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { calcularTotales } from "@/lib/precios";
import { formatearPrecio } from "@/lib/utils";
import {
  seleccionarTotalArticulos,
  seleccionarTotalCentimos,
  useCarrito,
  useCarritoHidratado,
} from "@/store/carrito";
import { ResumenCompra } from "./ResumenCompra";

const estadoInicial: EstadoCheckout = { ok: false };

/** Formulario de compra: datos de envío + pago (simulado) + resumen del pedido. */
export function FormularioCheckout() {
  const router = useRouter();
  const hidratado = useCarritoHidratado();
  const articulos = useCarrito((estado) => estado.articulos);
  const totalCentimos = useCarrito(seleccionarTotalCentimos);
  const totalArticulos = useCarrito(seleccionarTotalArticulos);
  const vaciar = useCarrito((estado) => estado.vaciar);
  const actualizarPrecios = useCarrito((estado) => estado.actualizarPrecios);

  // useActionState llama a la acción del servidor y nos devuelve su respuesta en "estado"
  const [estado, enviar, enviando] = useActionState(realizarPedido, estadoInicial);

  // Reaccionamos a la respuesta del servidor
  useEffect(() => {
    if (estado.preciosActualizados) actualizarPrecios(estado.preciosActualizados);
    if (estado.ok && estado.redirigir) {
      vaciar();
      if (estado.redirigir.startsWith("/")) router.push(estado.redirigir);
      else window.location.assign(estado.redirigir); // página de pago externa (Stripe)
    }
  }, [estado, actualizarPrecios, vaciar, router]);

  if (!hidratado) return <p className="mt-10 text-gris">Cargando tu pedido…</p>;

  if (estado.ok) {
    return <p className="mt-10 text-lg">¡Pago recibido! Preparando tu pedido…</p>;
  }

  if (articulos.length === 0) {
    return (
      <div className="mt-10 rounded-tarjeta bg-niebla px-6 py-12 text-center">
        <p className="text-xl font-medium">No hay nada que pagar todavía</p>
        <p className="mt-1 text-gris">Tu carrito está vacío.</p>
        <Boton href="/kits" variante="acento" tamano="lg" className="mt-6">
          Ver los kits
        </Boton>
      </div>
    );
  }

  // Lo que se envía al servidor: QUÉ quieres comprar (no los precios, que calcula él)
  const carrito = articulos.map(({ id, tipo, slug, piezas, nombre, cantidad }) => ({
    id,
    tipo,
    slug,
    piezas,
    nombre,
    cantidad,
  }));
  const v = estado.valores ?? {};
  const e = estado.errores ?? {};

  return (
    <form
      action={enviar}
      noValidate
      className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start"
    >
      <input type="hidden" name="carrito" value={JSON.stringify(carrito)} />
      <input type="hidden" name="totalMostrado" value={totalCentimos} />

      <div className="space-y-10">
        {estado.mensaje && (
          <p
            role="alert"
            className="flex items-start gap-3 rounded-control bg-error/8 p-4 text-sm text-error"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            {estado.mensaje}
          </p>
        )}

        <fieldset>
          <legend className="font-titulo text-2xl font-medium">¿A dónde te lo enviamos?</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Campo
              etiqueta="Nombre y apellidos"
              name="nombre"
              autoComplete="name"
              required
              defaultValue={v.nombre}
              error={e.nombre}
              className="sm:col-span-2"
            />
            <Campo
              etiqueta="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={v.email}
              error={e.email}
              ayuda="Solo lo usaremos para avisarte si hay algún problema con tu pedido."
              className="sm:col-span-2"
            />
            <Campo
              etiqueta="Dirección"
              name="direccion"
              autoComplete="street-address"
              required
              defaultValue={v.direccion}
              error={e.direccion}
              placeholder="Calle, número, piso"
              className="sm:col-span-2"
            />
            <Campo
              etiqueta="Código postal"
              name="codigoPostal"
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={5}
              required
              defaultValue={v.codigoPostal}
              error={e.codigoPostal}
            />
            <Campo
              etiqueta="Ciudad"
              name="ciudad"
              autoComplete="address-level2"
              required
              defaultValue={v.ciudad}
              error={e.ciudad}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-titulo text-2xl font-medium">Pago</legend>
          <div className="mt-5 flex items-start gap-3 rounded-tarjeta border border-dashed border-acento/40 bg-acento/5 p-5">
            <FlaskConical aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-acento" />
            <div>
              <p className="font-medium">Pago simulado</p>
              <p className="mt-1 text-sm text-gris">
                La tienda está en pruebas: no necesitas tarjeta y no se te cobrará nada. Al pulsar
                «Pagar» el pedido se guarda como pagado.
              </p>
            </div>
          </div>
        </fieldset>
      </div>

      <div className="lg:sticky lg:top-[calc(var(--spacing-nav)+1.5rem)]">
        <ResumenCompra subtotalCentimos={totalCentimos} totalArticulos={totalArticulos}>
          <ul className="mb-6 space-y-3 border-b border-linea pb-6 text-sm">
            {articulos.map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                {a.imagen && (
                  <Image
                    src={a.imagen}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="size-10 shrink-0 rounded-control bg-white object-contain p-1"
                  />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {a.cantidad > 1 && `${a.cantidad} × `}
                  {a.nombre}
                </span>
                <span className="tabular-nums">
                  {formatearPrecio(a.precioCentimos * a.cantidad)}
                </span>
              </li>
            ))}
          </ul>
          <Boton type="submit" variante="acento" tamano="xl" disabled={enviando} className="w-full">
            <Lock aria-hidden="true" className="size-5" />
            {enviando
              ? "Procesando…"
              : `Pagar ${formatearPrecio(calcularTotales(totalCentimos).totalCentimos)}`}
          </Boton>
          <Boton href="/carrito" variante="enlace" className="mt-3 w-full">
            ‹ Volver al carrito
          </Boton>
        </ResumenCompra>
      </div>
    </form>
  );
}
