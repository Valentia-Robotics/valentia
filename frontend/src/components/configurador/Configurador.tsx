"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialogo } from "@/components/ui/Dialogo";
import { categorias } from "@/config/categorias";
import { useConfigurador } from "@/store/configurador";
import type { Categoria, ComponenteCatalogo, KitParaConfigurador } from "@/types/catalogo";
import { BarraRobotMovil } from "./BarraRobotMovil";
import { DetallePieza } from "./DetallePieza";
import { InicioConfigurador } from "./InicioConfigurador";
import { ListaCategorias } from "./ListaCategorias";
import { PanelRobot } from "./PanelRobot";
import { TarjetaPieza } from "./TarjetaPieza";
import { maximoDe, useRobot } from "./useRobot";

interface Props {
  componentes: ComponenteCatalogo[];
  kits: KitParaConfigurador[];
  /** Kit que hay que cargar al entrar (viene de /configurador?kit=slug) */
  kitInicial: string | null;
}

/**
 * CONFIGURADOR estilo quiosco de pedidos.
 *   Ordenador: categorías a la izquierda · tarjetas en el centro · "Tu robot" a la derecha.
 *   Móvil: categorías deslizables arriba · tarjetas · "Tu robot" en una barra abajo.
 */
export function Configurador({ componentes, kits, kitInicial }: Props) {
  const router = useRouter();
  const robot = useRobot(componentes);
  const anadir = useConfigurador((estado) => estado.anadir);
  const cargarKit = useConfigurador((estado) => estado.cargarKit);

  const [categoria, setCategoria] = useState<Categoria>("PLACAS");
  const [detalle, setDetalle] = useState<string | null>(null);
  const [panelMovilAbierto, setPanelMovilAbierto] = useState(false);
  const [desdeCero, setDesdeCero] = useState(false);

  const porSlug = useMemo(() => new Map(componentes.map((c) => [c.slug, c])), [componentes]);
  const buscarComponente = useCallback((slug: string) => porSlug.get(slug), [porSlug]);

  // Al llegar con ?kit=slug cargamos ese kit (cuando ya se ha leído el robot guardado)
  // y quitamos el ?kit de la dirección para que recargar la página no lo vuelva a cargar.
  useEffect(() => {
    if (!robot.hidratado || !kitInicial) return;
    const kit = kits.find((k) => k.slug === kitInicial);
    if (kit) cargarKit(kit.slug, kit.piezas);
    router.replace("/configurador", { scroll: false });
  }, [robot.hidratado, kitInicial, kits, cargarKit, router]);

  const anadirPieza = useCallback(
    (slug: string, cantidad = 1) => {
      const componente = porSlug.get(slug);
      if (componente) anadir(slug, cantidad, maximoDe(componente));
    },
    [anadir, porSlug],
  );

  function cambiarCategoria(nueva: Categoria) {
    setCategoria(nueva);
    // En móvil, si has bajado mucho, volvemos arriba para ver las tarjetas nuevas
    if (window.scrollY > 200) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const infoCategoria = categorias.find((c) => c.id === categoria) ?? categorias[0];
  const piezasCategoria = componentes.filter((c) => c.categoria === categoria);
  const componenteDetalle = detalle ? porSlug.get(detalle) : undefined;
  const mostrarInicio = robot.hidratado && robot.piezas.length === 0 && !desdeCero && !kitInicial;

  const propsPanel = {
    robot,
    kits,
    buscarComponente,
    alAnadirPieza: anadirPieza,
    alVerPieza: (slug: string) => {
      setPanelMovilAbierto(false);
      setDetalle(slug);
    },
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[90rem] lg:grid lg:grid-cols-[11rem_1fr_21rem] lg:gap-6 lg:px-6 lg:py-6 xl:grid-cols-[13rem_1fr_24rem]">
        <ListaCategorias
          activa={categoria}
          alCambiar={cambiarCategoria}
          contadores={robot.porCategoria}
        />

        {/* ---------- Zona central: tarjetas ---------- */}
        <div className="min-w-0 px-4 py-6 sm:px-6 lg:p-0">
          <header>
            <p className="etiqueta-taller">Configurador</p>
            <h1 className="mt-1 text-3xl font-medium sm:text-4xl">Monta tu robot pieza a pieza.</h1>
          </header>

          {mostrarInicio && (
            <div className="mt-6">
              <InicioConfigurador
                kits={kits}
                alEmpezarDesdeCero={() => {
                  setDesdeCero(true);
                  setCategoria("PLACAS");
                }}
                alEmpezarDesdeKit={(kit) => cargarKit(kit.slug, kit.piezas)}
              />
            </div>
          )}

          <section aria-labelledby="titulo-categoria" className="mt-8">
            {/* key: al cambiar de categoría, título y tarjetas entran de nuevo con una animación suave */}
            <div key={`titulo-${categoria}`} className="flex animate-tarjeta items-center gap-3">
              <infoCategoria.icono
                aria-hidden="true"
                className="size-7 text-acento"
                strokeWidth={1.5}
              />
              <h2 id="titulo-categoria" className="text-2xl font-medium">
                {infoCategoria.nombre}
              </h2>
            </div>
            <p className="mt-1 text-gris">{infoCategoria.descripcion}</p>

            <ul
              key={categoria}
              className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
            >
              {piezasCategoria.map((componente, i) => (
                <li
                  key={componente.slug}
                  className="flex animate-tarjeta"
                  // Una detrás de otra (como mucho 0,3 s de espera, para no hacer esperar)
                  style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
                >
                  <TarjetaPieza
                    componente={componente}
                    enRobot={robot.cantidadDe(componente.slug)}
                    alAnadir={() => anadirPieza(componente.slug)}
                    alVerDetalle={() => setDetalle(componente.slug)}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---------- Panel "Tu robot" (ordenador) ---------- */}
        <aside aria-label="Tu robot" className="hidden lg:block">
          <div className="sticky top-[calc(var(--spacing-nav)+1.5rem)] h-[calc(100dvh-var(--spacing-nav)-3rem)] overflow-hidden rounded-tarjeta bg-niebla">
            <PanelRobot {...propsPanel} className="bg-niebla" />
          </div>
        </aside>
      </div>

      {/* ---------- Móvil: barra inferior + panel desplegable ---------- */}
      <BarraRobotMovil robot={robot} alAbrir={() => setPanelMovilAbierto(true)} />
      <Dialogo
        abierto={panelMovilAbierto}
        alCerrar={() => setPanelMovilAbierto(false)}
        titulo="Tu robot"
        posicion="abajo"
      >
        <PanelRobot {...propsPanel} mostrarTitulo={false} className="bg-white" />
      </Dialogo>

      {/* ---------- Detalle de una pieza ---------- */}
      <Dialogo
        abierto={componenteDetalle !== undefined}
        alCerrar={() => setDetalle(null)}
        titulo={componenteDetalle?.nombre ?? "Detalle"}
      >
        {componenteDetalle && (
          <DetallePieza
            // La clave reinicia el selector de cantidad al abrir otra pieza
            key={componenteDetalle.slug}
            componente={componenteDetalle}
            enRobot={robot.cantidadDe(componenteDetalle.slug)}
            alAnadir={(cantidad) => {
              anadirPieza(componenteDetalle.slug, cantidad);
              setDetalle(null);
            }}
          />
        )}
      </Dialogo>
    </>
  );
}
