"use client";

import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import Image from "next/image";
import Link from "next/link";
import { CircleAlert, FlaskConical, Lock, MapPin, Pencil } from "lucide-react";
import { startTransition, useActionState, useEffect, useId, useState, useTransition } from "react";
import {
  anularPedidoPendiente,
  confirmarPagoSimulado,
  prepararPedido,
  type EstadoCheckout,
} from "@/app/(tienda)/checkout/acciones";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { provinciasEnvio, tienda } from "@/config/tienda";
import { calcularTotales, provinciaDeCodigoPostal } from "@/lib/precios";
import { cn, formatearPrecio } from "@/lib/utils";
import { formatearTelefono } from "@/lib/validaciones/pedido";
import {
  seleccionarTotalArticulos,
  seleccionarTotalCentimos,
  useCarrito,
  useCarritoHidratado,
} from "@/store/carrito";
import { PagoStripe } from "./PagoStripe";
import { ResumenCompra } from "./ResumenCompra";

export interface DireccionGuardada {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
}

interface Props {
  /** null = compra como invitado */
  cuenta: { nombre: string; email: string } | null;
  direcciones: DireccionGuardada[];
  modo: "stripe" | "simulado" | "desactivado";
}

const estadoInicial: EstadoCheckout = { ok: false };
const NUEVA = "nueva";

/**
 * Checkout en dos pasos:
 *   1. ¿A dónde te lo enviamos? (direcciones guardadas o una nueva; email si no hay cuenta)
 *   2. Pago: formulario oficial de Stripe o, sin claves, «Confirmar pago de prueba».
 * El servidor recalcula los precios, comprueba la zona de envío y reserva el stock entre medias.
 */
export function FormularioCheckout({ cuenta, direcciones, modo }: Props) {
  const hidratado = useCarritoHidratado();
  const articulos = useCarrito((estado) => estado.articulos);
  const subtotal = useCarrito(seleccionarTotalCentimos);
  const totalArticulos = useCarrito(seleccionarTotalArticulos);
  const actualizarPrecios = useCarrito((estado) => estado.actualizarPrecios);

  const [estado, enviar, enviando] = useActionState(prepararPedido, estadoInicial);
  // El pedido preparado (paso 2). Se guarda aparte para poder volver al paso 1.
  const [pago, setPago] = useState<EstadoCheckout["pago"] | null>(null);
  const [seleccion, setSeleccion] = useState(direcciones[0]?.id ?? NUEVA);
  const [provincia, setProvincia] = useState(direcciones[0]?.provincia ?? "");
  const [anulando, iniciarAnulacion] = useTransition();
  const [pagando, iniciarPago] = useTransition();

  // Cada respuesta nueva del servidor: pasamos al pago o recuperamos la provincia escrita.
  // (Se hace durante el render, como recomienda React, en lugar de en un efecto.)
  const [respuestaVista, setRespuestaVista] = useState(estado);
  if (estado !== respuestaVista) {
    setRespuestaVista(estado);
    if (estado.ok && estado.pago) setPago(estado.pago);
    if (estado.valores?.provincia !== undefined) setProvincia(estado.valores.provincia);
  }

  // Al pasar al pago (o volver a los datos), subimos al principio de la página
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pago]);

  // Los precios nuevos van al carrito del navegador (un almacén externo a React)
  useEffect(() => {
    if (estado.preciosActualizados) actualizarPrecios(estado.preciosActualizados);
  }, [estado, actualizarPrecios]);

  if (!hidratado) return <p className="mt-10 text-gris">Cargando tu pedido…</p>;

  if (articulos.length === 0 && !pago) {
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

  if (modo === "desactivado") {
    return (
      <div className="mt-10 max-w-xl rounded-tarjeta bg-niebla p-6 sm:p-8">
        <h2 className="text-2xl font-medium">Aún no podemos cobrar pedidos online.</h2>
        <p className="mt-2 text-gris">
          Nos falta muy poco para abrir. Tu carrito se queda guardado en este navegador: déjanos tu
          email y te escribimos el día que puedas terminar la compra.
        </p>
        <FormularioAvisame
          origen="checkout"
          kitSlug={articulos.find((a) => a.tipo === "kit")?.slug}
          className="mt-5"
        />
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
  const guardada = direcciones.find((d) => d.id === seleccion);
  // Valores iniciales: lo que escribió (si hubo error) o la dirección guardada elegida
  const v: Record<string, string | undefined> = estado.valores ?? {
    nombre: guardada?.nombre ?? cuenta?.nombre,
    telefono: guardada ? formatearTelefono(guardada.telefono) : undefined,
    direccion: guardada?.direccion,
    codigoPostal: guardada?.codigoPostal,
    ciudad: guardada?.ciudad,
  };
  const e = estado.errores ?? {};
  const totales = calcularTotales(subtotal);

  function volverADatos() {
    if (!pago) return;
    iniciarAnulacion(async () => {
      await anularPedidoPendiente(pago.pedidoId, pago.token);
      setPago(null);
    });
  }

  const resumen = (
    <ResumenCompra subtotalCentimos={subtotal} totalArticulos={totalArticulos}>
      <ul className="space-y-3 text-sm">
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
            <span className="tabular-nums">{formatearPrecio(a.precioCentimos * a.cantidad)}</span>
          </li>
        ))}
      </ul>
    </ResumenCompra>
  );

  // ---------- Paso 2: pago ----------
  if (pago) {
    const urlVuelta = `${pago.url}&nuevo=1`;
    return (
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="space-y-8">
          <section className="flex items-start justify-between gap-4 rounded-tarjeta bg-niebla p-5">
            <div className="flex items-start gap-3 text-sm">
              <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-acento" />
              <div>
                <p className="font-medium">Pedido {pago.numero}</p>
                <p className="text-gris">
                  Hemos reservado tus productos durante una hora. Si quieres cambiar la dirección,
                  pulsa «Cambiar mis datos».
                </p>
              </div>
            </div>
            <Boton
              variante="secundario"
              onClick={volverADatos}
              disabled={anulando || pagando}
              className="shrink-0"
            >
              <Pencil aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Cambiar mis datos</span>
              <span className="sm:hidden">Cambiar</span>
            </Boton>
          </section>

          <section aria-labelledby="titulo-pago">
            <h2 id="titulo-pago" className="text-2xl font-medium">
              Pago
            </h2>
            {pago.modo === "stripe" ? (
              <PagoStripe
                clientSecret={pago.clientSecret}
                clavePublica={pago.clavePublica}
                urlVuelta={urlVuelta}
                totalCentimos={pago.totalCentimos}
              />
            ) : (
              <div className="mt-5 rounded-tarjeta border-2 border-dashed border-aviso/60 bg-aviso/5 p-6">
                <p className="flex items-center gap-2 font-medium text-aviso-oscuro">
                  <FlaskConical aria-hidden="true" className="size-5" />
                  MODO DE PRUEBA · no se cobra nada
                </p>
                <p className="mt-2 text-sm text-gris">
                  La tienda aún no tiene configurado el cobro con tarjeta. Este botón simula que el
                  pago se ha completado: el pedido pasará a «pagado» y recibirás el correo de
                  confirmación.
                </p>
                <Boton
                  variante="primario"
                  tamano="xl"
                  className="mt-5 w-full"
                  disabled={pagando || anulando}
                  onClick={() =>
                    iniciarPago(async () => {
                      await confirmarPagoSimulado(pago.pedidoId, pago.token);
                    })
                  }
                >
                  <FlaskConical aria-hidden="true" className="size-5" />
                  {pagando
                    ? "Confirmando…"
                    : `Confirmar pago de prueba (${formatearPrecio(pago.totalCentimos)})`}
                </Boton>
              </div>
            )}
          </section>
        </div>
        <div className="lg:sticky lg:top-[calc(var(--spacing-nav)+1.5rem)]">{resumen}</div>
      </div>
    );
  }

  // ---------- Paso 1: datos de envío ----------
  return (
    <form
      // Sin "action": así React no vacía el formulario al responder (se queda lo escrito)
      onSubmit={(evento) => {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget);
        startTransition(() => enviar(datos));
      }}
      noValidate
      className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start"
    >
      <input type="hidden" name="carrito" value={JSON.stringify(carrito)} />
      <input type="hidden" name="subtotalMostrado" value={subtotal} />

      <div className="space-y-10">
        {estado.mensaje && (
          <p
            role="alert"
            className="flex items-start gap-3 rounded-control bg-error/8 p-4 text-sm text-error-oscuro"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            {estado.mensaje}
          </p>
        )}

        {!cuenta && (
          <p className="rounded-tarjeta bg-niebla p-4 text-sm">
            Estás comprando como invitado.{" "}
            <Link
              href="/login?callbackUrl=%2Fcheckout"
              className="text-acento underline underline-offset-4"
            >
              Inicia sesión
            </Link>{" "}
            para usar tus direcciones guardadas y ver tus pedidos en «Mi cuenta».
          </p>
        )}

        {direcciones.length > 0 && (
          <fieldset>
            <legend className="font-titulo text-2xl font-medium">Tus direcciones</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[...direcciones, null].map((d) => (
                <OpcionDireccion
                  key={d?.id ?? NUEVA}
                  direccion={d}
                  elegida={seleccion === (d?.id ?? NUEVA)}
                  alElegir={() => {
                    setSeleccion(d?.id ?? NUEVA);
                    setProvincia(d?.provincia ?? "");
                  }}
                />
              ))}
            </div>
          </fieldset>
        )}

        {/* key: al elegir otra dirección guardada, los campos se rellenan de nuevo */}
        <fieldset key={estado.valores ? "error" : seleccion}>
          <legend className="font-titulo text-2xl font-medium">¿A dónde te lo enviamos?</legend>
          <p className="mt-1 text-sm text-gris">
            Enviamos a toda la {tienda.envio.nombreZona} ({tienda.envio.plazo}).
          </p>
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
            {cuenta ? (
              <p className="text-sm sm:col-span-2">
                <span className="font-medium">Email: </span>
                <span className="wrap-anywhere text-gris">{cuenta.email}</span>
              </p>
            ) : (
              <Campo
                etiqueta="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={v.email}
                error={e.email}
                ayuda="Te enviaremos aquí la confirmación y el seguimiento del pedido."
                className="sm:col-span-2"
              />
            )}
            <Campo
              etiqueta="Teléfono"
              name="telefono"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              defaultValue={v.telefono}
              error={e.telefono}
              ayuda="Para que el transportista pueda avisarte."
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
              ayuda="Empieza por 03, 46 o 12."
              onChange={(evento) => {
                // Elegimos la provincia sola a partir del código postal
                const deducida = provinciaDeCodigoPostal(evento.currentTarget.value);
                if (deducida) setProvincia(deducida);
              }}
            />
            <Campo
              etiqueta="Ciudad"
              name="ciudad"
              autoComplete="address-level2"
              required
              defaultValue={v.ciudad}
              error={e.ciudad}
            />
            <SelectorProvincia valor={provincia} alCambiar={setProvincia} error={e.provincia} />
          </div>
          {cuenta && seleccion === NUEVA && (
            <label className="mt-5 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="guardarDireccion"
                defaultChecked
                className="size-4 accent-acento"
              />
              Guardar esta dirección en mi cuenta
            </label>
          )}
        </fieldset>

        <div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="aceptaCondiciones"
              required
              aria-invalid={e.aceptaCondiciones ? true : undefined}
              aria-describedby={e.aceptaCondiciones ? "error-condiciones" : undefined}
              defaultChecked={v.aceptaCondiciones === "on"}
              className="mt-0.5 size-4 shrink-0 accent-acento"
            />
            <span>
              He leído y acepto las{" "}
              <Link href="/legal/condiciones" target="_blank" className="text-acento underline">
                condiciones de venta
              </Link>{" "}
              (incluido el{" "}
              <Link href="/legal/devoluciones" target="_blank" className="text-acento underline">
                derecho de desistimiento de {tienda.diasDesistimiento} días
              </Link>
              ) y la{" "}
              <Link href="/legal/privacidad" target="_blank" className="text-acento underline">
                política de privacidad
              </Link>
              .
            </span>
          </label>
          {e.aceptaCondiciones && (
            <p id="error-condiciones" className="mt-1.5 text-sm text-error">
              {e.aceptaCondiciones}
            </p>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-[calc(var(--spacing-nav)+1.5rem)]">
        {resumen}
        <Boton
          type="submit"
          variante="acento"
          tamano="xl"
          disabled={enviando}
          className="mt-4 w-full"
        >
          <Lock aria-hidden="true" className="size-5" />
          {enviando
            ? "Preparando tu pedido…"
            : `Continuar al pago · ${formatearPrecio(totales.totalCentimos)}`}
        </Boton>
        <Boton href="/carrito" variante="enlace" className="mt-3 w-full">
          ‹ Volver al carrito
        </Boton>
      </div>
    </form>
  );
}

function OpcionDireccion({
  direccion,
  elegida,
  alElegir,
}: {
  direccion: DireccionGuardada | null;
  elegida: boolean;
  alElegir: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-control p-4 text-sm ring-1 transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento",
        elegida ? "bg-acento/5 ring-2 ring-acento" : "ring-linea hover:bg-niebla",
      )}
    >
      <input
        type="radio"
        name="direccionGuardada"
        checked={elegida}
        onChange={alElegir}
        className="mt-0.5 size-4 accent-acento"
      />
      {direccion ? (
        <span>
          <span className="block font-medium">{direccion.nombre}</span>
          <span className="block text-gris">
            {direccion.direccion}, {direccion.codigoPostal} {direccion.ciudad}
          </span>
        </span>
      ) : (
        <span className="font-medium">Otra dirección</span>
      )}
    </label>
  );
}

function SelectorProvincia({
  valor,
  alCambiar,
  error,
}: {
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="block text-sm font-medium">
        Provincia
      </label>
      <select
        id={id}
        name="provincia"
        required
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "mt-1.5 h-12 w-full rounded-control bg-white px-4 text-base ring-1 outline-none focus:ring-2 focus:ring-acento",
          error ? "ring-error" : "ring-linea",
        )}
      >
        <option value="">Elige tu provincia</option>
        {provinciasEnvio.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
