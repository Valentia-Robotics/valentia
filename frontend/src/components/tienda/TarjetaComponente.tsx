import Image from "next/image";
import Link from "next/link";
import { BotonAnadirCarrito } from "@/components/tienda/BotonAnadirCarrito";
import { Led } from "@/components/ui/Led";
import { textoTienda } from "@/config/stock";
import { formatearNumero, formatearPrecio } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";

/**
 * HOJA DE UN COMPONENTE SUELTO (/componentes): referencia y stock con LED, foto sobre rejilla, los tres
 * datos eléctricos que deciden si encaja (tensión, consumo, GPIO) y precio con su tecla de añadir.
 * La tabla completa está en su ficha. Va dentro de un <li> con fondo.
 */
export function TarjetaComponente({ componente: c }: { componente: ComponenteCatalogo }) {
  const agotado = c.stock === 0;
  const estado = textoTienda(c.stock, c.enReposicion);
  const esPlaca = c.tipo === "placa";
  const esBateria = c.tipo === "bateria";
  const datos: [string, string][] = [
    [
      esBateria ? "Entrega" : "Tensión",
      c.voltaje ? `${formatearNumero(c.voltaje)} V` : "—",
    ],
    [
      esBateria ? "I máx." : "Consumo",
      c.consumoMa ? `${formatearNumero(c.consumoMa)} mA` : "—",
    ],
    [esPlaca ? "GPIO disp." : "GPIO", c.pines ? String(c.pines) : "—"],
  ];

  return (
    <article className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="mono-etiqueta truncate text-gris">REF · {c.slug.toUpperCase()}</span>
        <Led
          estado={estado === "En stock" ? "ok" : estado === "En reposición" ? "aviso" : "apagado"}
          texto={estado}
          className="shrink-0 text-[10px] text-gris"
        />
      </div>
      <Link
        href={`/componentes/${c.slug}`}
        tabIndex={-1}
        className="rejilla-plano-fina mt-4 block border border-linea bg-panel p-5 transition-colors duration-150 hover:border-borde-fuerte"
      >
        <Image
          src={c.imagen}
          alt={`Foto de ${c.nombre}`}
          width={240}
          height={240}
          unoptimized
          className="mx-auto aspect-square h-auto w-full max-w-40"
        />
      </Link>

      <h3 className="mt-4 text-base leading-snug font-semibold">
        <Link
          href={`/componentes/${c.slug}`}
          className="transition-colors duration-100 hover:text-acento"
        >
          {c.nombre}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-gris">{c.resumen}</p>

      <dl className="mt-4 grid grid-cols-3 border-t border-l border-linea font-mono text-[12px]">
        {datos.map(([nombre, valor]) => (
          <div key={nombre} className="border-r border-b border-linea px-2 py-1.5">
            <dt className="mono-etiqueta text-[10px] text-gris">{nombre}</dt>
            <dd className="mt-0.5 truncate text-tinta">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="font-mono text-lg text-tinta tabular-nums">
          {formatearPrecio(c.precioCentimos)}
        </span>
        <BotonAnadirCarrito
          articulo={{
            id: `componente:${c.slug}`,
            tipo: "componente",
            slug: c.slug,
            nombre: c.nombre,
            precioCentimos: c.precioCentimos,
            imagen: c.imagen,
          }}
          texto="Añadir"
          tamano="md"
          disabled={agotado}
        />
      </div>
    </article>
  );
}
