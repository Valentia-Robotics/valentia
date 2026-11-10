import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CircleAlert, CircleCheck, PackageSearch, Truck } from "lucide-react";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { TarjetaDato } from "@/components/admin/TarjetaDato";
import { EditarStock } from "@/components/stock/EditarStock";
import { ESTADOS_STOCK, MINIMO_POR_DEFECTO, faltanParaMinimo } from "@/config/stock";
import { fechaHora } from "@/lib/admin/formato";
import { exigirUsuario } from "@/lib/sesion";
import { listarStock, ultimosMovimientos, type FilaStock } from "@/lib/stock/stock";
import { cn, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Stock" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const FILTROS = [
  { id: undefined, nombre: "Todo" },
  { id: "reponer", nombre: "Por reponer" },
  { id: "pedido", nombre: "Pedido en camino" },
] as const;

/** STOCK: cuánto queda de cada kit y de cada componente, y qué hay que pedir */
export default async function PaginaStock({ searchParams }: Props) {
  const yo = await exigirUsuario("/stock");
  const puedeCambiar = yo.rol === "ADMIN";
  const p = await searchParams;
  const ver = FILTROS.find((f) => f.id && f.id === p.ver)?.id;

  const [{ kits, componentes }, movimientos] = await Promise.all([
    listarStock(),
    ultimosMovimientos(),
  ]);
  const todo = [...kits, ...componentes];
  const cuenta = (...estados: FilaStock["estado"][]) =>
    todo.filter((f) => estados.includes(f.estado)).length;
  const porReponer = cuenta("agotado", "bajo");

  const filtrar = (filas: FilaStock[]) =>
    ver === "reponer"
      ? filas.filter((f) => f.estado === "agotado" || f.estado === "bajo")
      : ver === "pedido"
        ? filas.filter((f) => f.estado === "pedido")
        : filas;

  return (
    <>
      <Cabecera
        titulo="Stock"
        descripcion={
          puedeCambiar
            ? "Lo que hay en el almacén de cada kit y de cada componente. Cada venta lo descuenta sola; aquí se apunta lo que llega."
            : "Lo que hay en el almacén de cada kit y de cada componente. Solo administración puede cambiar las cifras."
        }
      />

      {porReponer > 0 && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-lg bg-error/10 px-4 py-3 text-sm text-error-oscuro"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium">
              {porReponer === 1
                ? "Hay 1 producto que necesita reposición."
                : `Hay ${porReponer} productos que necesitan reposición.`}
            </span>{" "}
            Conviene hacer el pedido al proveedor
            {puedeCambiar
              ? " y marcar «Ya hemos pedido más» para que el equipo lo sepa."
              : "; administración lo marcará cuando esté pedido."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDato
          titulo="Reposición necesaria"
          valor={cuenta("agotado")}
          detalle="Sin unidades y sin pedir"
          icono={CircleAlert}
        />
        <TarjetaDato
          titulo="Stock bajo"
          valor={cuenta("bajo")}
          detalle="Quedan pocas unidades"
          icono={PackageSearch}
        />
        <TarjetaDato
          titulo="Reposición en curso"
          valor={cuenta("pedido")}
          detalle="Pedido, falta que llegue"
          icono={Truck}
        />
        <TarjetaDato
          titulo="Stock suficiente"
          valor={cuenta("ok")}
          detalle={`De ${plural(todo.length, "producto", "productos")}`}
          icono={CircleCheck}
        />
      </div>

      <nav aria-label="Filtrar" className="mt-6 mb-4 flex flex-wrap gap-1.5 text-[13px]">
        {FILTROS.map((f) => (
          <Link
            key={f.nombre}
            href={f.id ? `/stock?ver=${f.id}` : "/stock"}
            aria-current={ver === f.id ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1 ring-1",
              ver === f.id
                ? "bg-tinta text-white ring-tinta"
                : "bg-white ring-linea hover:ring-tinta/40",
            )}
          >
            {f.nombre}
          </Link>
        ))}
      </nav>

      <div className="space-y-6">
        <TablaStock
          titulo="Kits"
          filas={filtrar(kits)}
          puedeCambiar={puedeCambiar}
          nota={`Kits montados y en su caja. Aviso de siempre: ${MINIMO_POR_DEFECTO.kit} o menos.`}
        />
        <TablaStock
          titulo="Componentes"
          filas={filtrar(componentes)}
          puedeCambiar={puedeCambiar}
          nota={`Piezas sueltas (también las del configurador). Aviso de siempre: ${MINIMO_POR_DEFECTO.componente} o menos.`}
        />

        <Caja titulo="Últimos cambios" sinRelleno>
          {movimientos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gris sm:px-5">
              Todavía no se ha apuntado ningún cambio a mano.
            </p>
          ) : (
            <ul className="divide-y divide-linea text-sm">
              {movimientos.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
                >
                  <span>
                    <span className="font-medium">{m.nombre}</span>
                    <span className="text-gris"> · {textoMovimiento(m)}</span>
                  </span>
                  <span className="text-xs text-gris">
                    {m.autorNombre} · {fechaHora(m.creadoEn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Caja>
      </div>
    </>
  );
}

/** «De 0 a 25 unidades · aviso con 5 · marcado como pedido» */
function textoMovimiento(m: {
  antes: number;
  despues: number;
  minimoDespues: number | null;
  reposicion: boolean | null;
}) {
  const partes: string[] = [];
  if (m.antes !== m.despues) {
    const diferencia = m.despues - m.antes;
    partes.push(
      `de ${m.antes} a ${m.despues} unidades (${diferencia > 0 ? "+" : ""}${diferencia})`,
    );
  }
  if (m.minimoDespues !== null) partes.push(`aviso con ${m.minimoDespues} o menos`);
  if (m.reposicion !== null)
    partes.push(m.reposicion ? "marcado como pedido" : "ya no está pedido");
  return partes.join(" · ");
}

function TablaStock({
  titulo,
  filas,
  puedeCambiar,
  nota,
}: {
  titulo: string;
  filas: FilaStock[];
  puedeCambiar: boolean;
  nota: string;
}) {
  return (
    <Caja titulo={titulo} sinRelleno>
      <p className="border-b border-linea px-4 py-2.5 text-xs text-gris sm:px-5">{nota}</p>
      <Tabla
        etiqueta={`Stock de ${titulo.toLowerCase()}`}
        columnas={["Producto", "Unidades", "Avisar con", "Estado", ...(puedeCambiar ? [""] : [])]}
        vacia={filas.length === 0 && "Nada por aquí con este filtro."}
      >
        {filas.map((f) => {
          const estado = ESTADOS_STOCK[f.estado];
          const faltan = faltanParaMinimo(f.unidades, f.minimo);
          return (
            <tr key={f.id}>
              <td>
                <div className="flex items-center gap-3">
                  <Image
                    src={f.imagen}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="size-10 shrink-0 rounded bg-niebla object-contain p-0.5"
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{f.nombre}</p>
                    <p className="text-xs text-gris">
                      {f.grupo}
                      {!f.visible && " · Oculto en la tienda"}
                    </p>
                  </div>
                </div>
              </td>
              <td
                className={cn(
                  "font-titulo text-lg tabular-nums",
                  f.estado === "agotado" && "text-error",
                )}
              >
                {f.unidades}
              </td>
              <td className="text-gris tabular-nums">
                {f.minimo} o menos
                {!f.minimoPropio && <span className="block text-xs">(por defecto)</span>}
              </td>
              <td>
                <Insignia tono={estado.tono}>{estado.nombre}</Insignia>
                <p className="mt-1 max-w-56 text-xs text-gris">
                  {(f.estado === "agotado" || f.estado === "bajo") && faltan > 0
                    ? `Pedir al menos ${faltan} para salir del aviso.`
                    : estado.detalle}
                </p>
              </td>
              {puedeCambiar && (
                <td className="text-right">
                  <EditarStock
                    tipo={f.tipo}
                    id={f.id}
                    nombre={f.nombre}
                    unidades={f.unidades}
                    minimoPropio={f.minimoPropio ? f.minimo : null}
                    enReposicion={f.enReposicion}
                  />
                </td>
              )}
            </tr>
          );
        })}
      </Tabla>
    </Caja>
  );
}
