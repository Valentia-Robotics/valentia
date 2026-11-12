"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BotonAnadirCarrito } from "@/components/tienda/BotonAnadirCarrito";
import { SelectorCantidad } from "@/components/ui/SelectorCantidad";
import { cn, formatearPrecio, plural } from "@/lib/utils";
import { useConfigurador } from "@/store/configurador";
import type { ArticuloCarrito } from "@/types/carrito";
import type { ComponenteCatalogo, KitParaConfigurador } from "@/types/catalogo";
import { AvisosCompatibilidad } from "./AvisosCompatibilidad";
import { EsquemaBloques } from "./EsquemaBloques";
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
  /** true en el móvil: el esquema de bloques va aquí (en el ordenador está encima de las piezas) */
  conEsquema?: boolean;
  /** Clases extra; incluye el color de fondo (la barra del total lo hereda) */
  className?: string;
}

/**
 * Panel del montaje: lista de materiales con + y −, lecturas (GPIO y corriente), registro de avisos,
 * total en tiempo real y la tecla «Añadir al carrito».
 */
export function PanelRobot({
  robot,
  kits,
  buscarComponente,
  alAnadirPieza,
  alVerPieza,
  mostrarTitulo = true,
  conEsquema = false,
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
          {mostrarTitulo && (
            <h2 className="mono-etiqueta text-gris">
              <span className="text-acento">{"// "}</span>Lista de materiales
            </h2>
          )}
          <p className="mt-1 font-mono text-[12px] text-tinta">
            {vacio ? "0 piezas" : plural(totalPiezas, "pieza", "piezas")}
            {kit && !vacio && <span className="text-gris"> · base: {kit.nombre}</span>}
          </p>
        </div>
        {!vacio && !confirmarVaciar && (
          <button
            type="button"
            onClick={() => setConfirmarVaciar(true)}
            className="tecla mono-etiqueta shrink-0 border border-borde-fuerte px-2.5 py-1.5 text-gris transition-colors duration-100 hover:text-tinta"
          >
            Reset
          </button>
        )}
      </div>

      {/* Confirmación en dos pasos para no borrar el robot sin querer */}
      {confirmarVaciar && (
        <div className="mx-5 mt-3 flex flex-wrap items-center gap-2 border border-error/50 p-3 text-sm">
          <span className="flex-1">¿Quitar todas las piezas del banco?</span>
          <button
            type="button"
            onClick={() => {
              vaciar();
              setConfirmarVaciar(false);
            }}
            className="mono-etiqueta bg-error px-3 py-1.5 text-carbon"
          >
            Vaciar
          </button>
          <button
            type="button"
            onClick={() => setConfirmarVaciar(false)}
            className="mono-etiqueta border border-borde-fuerte px-3 py-1.5"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ---------- Piezas + avisos (zona con scroll en ordenador) ---------- */}
      <div className="space-y-5 px-5 py-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {!robot.hidratado ? (
          <p className="mono-etiqueta py-8 text-center text-gris">Cargando montaje…</p>
        ) : vacio ? (
          <EstadoVacio />
        ) : (
          <>
            <ul className="border-t border-linea">
              {piezas.map(({ componente, cantidad }) => (
                <li
                  // La clave cambia al añadir esta pieza, así la animación se repite en cada clic
                  key={
                    ultimaAnadida?.slug === componente.slug
                      ? `${componente.slug}-${ultimaAnadida.vez}`
                      : componente.slug
                  }
                  className={cn(
                    "-mx-2 flex items-center gap-3 border-b border-linea px-2 py-2",
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
                      className="size-11 shrink-0 border border-linea bg-carbon p-1"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">
                        {componente.nombre}
                      </span>
                      <span className="block font-mono text-[11px] text-gris tabular-nums">
                        {formatearPrecio(componente.precioCentimos * cantidad)}
                        {componente.consumoMa > 0 && componente.tipo !== "bateria"
                          ? ` · ${componente.consumoMa * cantidad} mA`
                          : ""}
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

            {conEsquema && <EsquemaBloques piezas={piezas} />}

            <Medidores medidores={diagnostico.medidores} />

            <AvisosCompatibilidad
              diagnostico={diagnostico}
              buscarComponente={buscarComponente}
              alAnadirSugerencia={alAnadirPieza}
            />

            {esKitExacto && (
              <p className="border border-linea p-3 text-sm text-gris">
                Coincide con el kit «{kit.nombre}». Comprado como kit incluye su curso y el código
                QR.{" "}
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
          <span className="mono-etiqueta text-gris">Total · IVA incl.</span>
          <span className="font-mono text-2xl text-tinta tabular-nums">
            {formatearPrecio(totalCentimos)}
          </span>
        </div>

        {diagnostico.errores > 0 && (
          <p className="mt-2 text-xs text-error">
            Con errores en el registro el montaje no funcionará tal cual. Se puede comprar igualmente.
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
    <div className="border border-dashed border-borde-fuerte p-5">
      <p className="mono-etiqueta text-tinta">Banco vacío</p>
      <p className="mt-1.5 text-sm text-gris">
        Empieza por la placa (CAT_01) o carga la lista de materiales de un kit.
      </p>
    </div>
  );
}
