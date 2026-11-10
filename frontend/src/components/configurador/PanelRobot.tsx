"use client";

import Image from "next/image";
import Link from "next/link";
import { Bot, RotateCcw } from "lucide-react";
import { useState } from "react";
import { BotonAnadirCarrito } from "@/components/tienda/BotonAnadirCarrito";
import { SelectorCantidad } from "@/components/ui/SelectorCantidad";
import { cn, formatearPrecio, plural } from "@/lib/utils";
import { useConfigurador } from "@/store/configurador";
import type { ArticuloCarrito } from "@/types/carrito";
import type { ComponenteCatalogo, KitParaConfigurador } from "@/types/catalogo";
import { AvisosCompatibilidad } from "./AvisosCompatibilidad";
import { Medidores } from "./Medidores";
import { maximoDe, type Robot } from "./useRobot";

interface Props {
  robot: Robot;
  kits: KitParaConfigurador[];
  buscarComponente: (slug: string) => ComponenteCatalogo | undefined;
  alAnadirPieza: (slug: string) => void;
  alVerPieza: (slug: string) => void;
  /** false cuando el panel va dentro de una ventana que ya tiene su propio título (móvil) */
  mostrarTitulo?: boolean;
  /** Clases extra; incluye el color de fondo (la barra del total lo hereda) */
  className?: string;
}

/**
 * Panel "Tu robot": piezas elegidas con botones + y −, avisos de compatibilidad,
 * total en tiempo real y botón grande "Añadir al carrito".
 */
export function PanelRobot({
  robot,
  kits,
  buscarComponente,
  alAnadirPieza,
  alVerPieza,
  mostrarTitulo = true,
  className,
}: Props) {
  const kitOrigen = useConfigurador((estado) => estado.kitOrigen);
  const ultimaAnadida = useConfigurador((estado) => estado.ultimaAnadida);
  const cambiarCantidad = useConfigurador((estado) => estado.cambiarCantidad);
  const vaciar = useConfigurador((estado) => estado.vaciar);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);

  const { piezas, totalCentimos, totalPiezas, diagnostico } = robot;
  const vacio = piezas.length === 0;
  const kit = kits.find((k) => k.slug === kitOrigen);

  // ¿El robot es exactamente igual que el kit del que partió?
  const esKitExacto =
    kit !== undefined &&
    kit.piezas.length === piezas.length &&
    kit.piezas.every((p) => robot.cantidadDe(p.slug) === p.cantidad);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* ---------- Cabecera ---------- */}
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5">
        <div>
          {mostrarTitulo && <h2 className="text-2xl font-medium">Tu robot</h2>}
          <p className="text-sm text-gris">
            {vacio ? "Todavía sin piezas" : plural(totalPiezas, "pieza", "piezas")}
            {kit && !vacio && <> · basado en «{kit.nombre}»</>}
          </p>
        </div>
        {!vacio && !confirmarVaciar && (
          <button
            type="button"
            onClick={() => setConfirmarVaciar(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-boton px-3 py-1.5 text-xs text-gris ring-1 ring-linea transition-colors hover:text-tinta hover:ring-tinta"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Empezar de nuevo
          </button>
        )}
      </div>

      {/* Confirmación en dos pasos para no borrar el robot sin querer */}
      {confirmarVaciar && (
        <div className="mx-5 mt-3 flex flex-wrap items-center gap-2 rounded-control bg-error/8 p-3 text-sm">
          <span className="flex-1">¿Quitar todas las piezas?</span>
          <button
            type="button"
            onClick={() => {
              vaciar();
              setConfirmarVaciar(false);
            }}
            className="rounded-boton bg-error px-3 py-1.5 text-xs font-medium text-white"
          >
            Sí, vaciar
          </button>
          <button
            type="button"
            onClick={() => setConfirmarVaciar(false)}
            className="rounded-boton px-3 py-1.5 text-xs ring-1 ring-linea"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ---------- Piezas + avisos (zona con scroll en ordenador) ---------- */}
      <div className="space-y-5 px-5 py-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {!robot.hidratado ? (
          <p className="py-8 text-center text-sm text-gris">Cargando tu robot…</p>
        ) : vacio ? (
          <EstadoVacio />
        ) : (
          <>
            <ul className="divide-y divide-linea">
              {piezas.map(({ componente, cantidad }) => (
                <li
                  // La clave cambia al añadir esta pieza, así la animación se repite en cada clic
                  key={
                    ultimaAnadida?.slug === componente.slug
                      ? `${componente.slug}-${ultimaAnadida.vez}`
                      : componente.slug
                  }
                  className={cn(
                    "-mx-2 flex items-center gap-3 rounded-control px-2 py-2.5",
                    ultimaAnadida?.slug === componente.slug && "animate-resaltar",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => alVerPieza(componente.slug)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Image
                      src={componente.imagen}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="size-12 shrink-0 rounded-control bg-white p-1 ring-1 ring-linea"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {componente.nombre}
                      </span>
                      <span className="block text-xs text-gris tabular-nums">
                        {formatearPrecio(componente.precioCentimos * cantidad)}
                      </span>
                    </span>
                  </button>
                  <SelectorCantidad
                    valor={cantidad}
                    maximo={maximoDe(componente)}
                    alCambiar={(n) => cambiarCantidad(componente.slug, n, maximoDe(componente))}
                    etiqueta={`Cantidad de ${componente.nombre}`}
                  />
                </li>
              ))}
            </ul>

            <Medidores medidores={diagnostico.medidores} />

            <AvisosCompatibilidad
              diagnostico={diagnostico}
              buscarComponente={buscarComponente}
              alAnadirSugerencia={alAnadirPieza}
            />

            {esKitExacto && (
              <p className="rounded-control bg-white p-3 text-sm ring-1 ring-linea">
                Es el kit «{kit.nombre}» tal cual. Si lo compras como kit, incluye su curso y el
                código QR.{" "}
                <Link
                  href={`/kits/${kit.slug}`}
                  className="text-acento underline underline-offset-4"
                >
                  Ver el kit
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      {/* ---------- Total y compra (siempre visible abajo) ---------- */}
      <div className="sticky bottom-0 shrink-0 border-t border-linea bg-inherit px-5 pt-4 pb-5">
        <div className="flex items-baseline justify-between">
          <span className="text-gris">Total</span>
          <span className="font-titulo text-3xl font-medium tabular-nums">
            {formatearPrecio(totalCentimos)}
          </span>
        </div>
        <p className="text-right text-xs text-gris">IVA incluido</p>

        {diagnostico.errores > 0 && (
          <p className="mt-2 text-xs text-error">
            Así como está, el robot no va a funcionar: mira los avisos. Si aun así lo quieres,
            puedes comprarlo.
          </p>
        )}

        <BotonAnadirCarrito
          articulo={crearArticulo(robot, kit)}
          disabled={vacio}
          tamano="xl"
          className="mt-3 w-full"
        />
      </div>
    </div>
  );
}

/** Convierte el robot en un artículo del carrito ("configuración personalizada") */
function crearArticulo(robot: Robot, kit?: KitParaConfigurador): Omit<ArticuloCarrito, "cantidad"> {
  const { piezas } = robot;
  const placa = piezas.find((p) => p.componente.tipo === "placa");
  return {
    // El mismo robot da siempre el mismo id: si lo añades dos veces, suma 2 unidades
    id: `configuracion:${piezas.map((p) => `${p.componente.slug}x${p.cantidad}`).join("+")}`,
    tipo: "configuracion",
    nombre: kit ? `${kit.nombre} personalizado` : "Mi robot personalizado",
    precioCentimos: robot.totalCentimos,
    imagen: kit?.imagen ?? (placa ?? piezas[0])?.componente.imagen,
    piezas: piezas.map((p) => ({ slug: p.componente.slug, cantidad: p.cantidad })),
    detalle: piezas.map((p) => `${p.cantidad} × ${p.componente.nombre}`),
  };
}

/**
 * Lo que se ve cuando el robot no tiene piezas. Los kits para empezar ya salen en «¿Cómo quieres
 * empezar?», a la izquierda: aquí no se repiten, solo se dice por dónde seguir.
 */
function EstadoVacio() {
  return (
    <div className="py-6 text-center">
      <Bot aria-hidden="true" className="mx-auto size-12 text-gris-claro" strokeWidth={1.2} />
      <p className="mt-3 font-medium">Tu robot está vacío</p>
      <p className="mt-1 text-sm text-gris">
        Elige una placa para empezar, o parte de uno de nuestros kits.
      </p>
    </div>
  );
}
