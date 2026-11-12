import { FormularioAvisame } from "@/components/espera/FormularioAvisame";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { Led } from "@/components/ui/Led";
import { MarcoCAD } from "@/components/ui/MarcoCAD";
import { tienda } from "@/config/tienda";
import { formatearPrecio } from "@/lib/utils";

/**
 * SEC_05 · ESTADO DE LA TIENDA: una consola con el estado (LED), los datos de envío y, mientras no se
 * cobra, la lista de espera; con la tienda abierta, el botón para elegir kit.
 */
export function BloqueFinal({ compraAbierta }: { compraAbierta: boolean }) {
  const envio = [
    ["Zona", tienda.envio.nombreZona],
    ["Plazo", tienda.envio.plazo],
    ["Envío", formatearPrecio(tienda.envio.costeCentimos)],
    ["Gratis desde", formatearPrecio(tienda.envio.gratisDesdeCentimos)],
  ];
  return (
    <section
      id="avisame"
      aria-labelledby="titulo-final"
      className="rejilla-plano scroll-mt-nav border-t border-linea py-20 sm:py-28"
    >
      <Contenedor className="max-w-4xl">
        <MarcoCAD
          etiqueta="SEC_05 · Estado de la tienda"
          cota={compraAbierta ? "ONLINE" : "PREVENTA"}
          className="aparecer bg-carbon p-6 pt-9 sm:p-10 sm:pt-12"
        >
          <Led
            estado={compraAbierta ? "ok" : "aviso"}
            parpadeo={!compraAbierta}
            texto={compraAbierta ? "Venta abierta · stock disponible" : "Primera tirada en preparación"}
          />
          <h2 id="titulo-final" className="titular-cartel mt-5 text-4xl font-semibold sm:text-6xl">
            {compraAbierta ? "Listo para enviar." : "Apertura de la venta: pronto."}
          </h2>
          {compraAbierta ? (
            <Boton href="/kits" variante="primario" tamano="lg" className="mt-8">
              Elegir kit
            </Boton>
          ) : (
            <>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gris">
                Déjanos un correo y te escribimos una sola vez: el día que se pueda comprar.
              </p>
              <FormularioAvisame origen="portada" className="mt-7 max-w-lg" />
            </>
          )}
          <dl className="mt-10 grid grid-cols-2 border-t border-l border-linea font-mono text-[12px] sm:grid-cols-4">
            {envio.map(([nombre, valor]) => (
              <div key={nombre} className="border-r border-b border-linea px-3 py-2.5">
                <dt className="mono-etiqueta text-[10px] text-gris">{nombre}</dt>
                <dd className="mt-0.5 text-tinta">{valor}</dd>
              </div>
            ))}
          </dl>
        </MarcoCAD>
      </Contenedor>
    </section>
  );
}
