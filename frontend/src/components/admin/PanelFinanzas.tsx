import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Percent,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Aviso } from "@/components/admin/Aviso";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import {
  GraficoAcumulado,
  GraficoBeneficio,
  GraficoIngresosGastos,
} from "@/components/admin/GraficosFinanzas";
import { ListaConBarras } from "@/components/admin/ListaConBarras";
import { Tabla } from "@/components/admin/Tabla";
import { TarjetaDato } from "@/components/admin/TarjetaDato";
import { mesLargo, nombreCategoria, periodoEnTexto } from "@/config/finanzas";
import { fecha } from "@/lib/admin/formato";
import type { DatosFinanzas } from "@/lib/admin/finanzas";
import { cn, formatearPrecio, plural } from "@/lib/utils";

/** Cuántos movimientos se ven en la lista (todos van en la descarga para Excel) */
const MAXIMO_LISTA = 60;

const conSigno = (centimos: number) =>
  `${centimos < 0 ? "−" : ""}${formatearPrecio(Math.abs(centimos))}`;

/** Contenido de /admin/finanzas */
export function PanelFinanzas({ d, aviso }: { d: DatosFinanzas; aviso?: string }) {
  const r = d.resumen;
  const actual = periodoEnTexto(d.periodo);
  const periodos = [
    { valor: "12m", texto: "Últimos 12 meses" },
    ...d.anios.map((a) => ({ valor: String(a), texto: String(a) })),
    { valor: "todo", texto: "Desde el principio" },
  ];
  const mesEnCurso = r.meses.find((m) => m.mes === d.mesActual);
  const vacio = r.numIngresos + r.numGastos === 0;

  return (
    <>
      <Cabecera
        titulo="Finanzas"
        descripcion="Lo que entra, lo que sale y lo que gana la empresa. Las ventas reales de la web se suman solas (los pedidos de prueba no cuentan); el resto se apunta aquí."
        acciones={
          <>
            <BotonAdmin href="/admin/finanzas/nuevo?tipo=ingreso" variante="secundario">
              <Plus aria-hidden="true" className="size-4" />
              Ingreso
            </BotonAdmin>
            <BotonAdmin href="/admin/finanzas/nuevo">
              <Plus aria-hidden="true" className="size-4" />
              Gasto
            </BotonAdmin>
          </>
        }
      />

      {aviso && (
        <Aviso tipo="exito" className="mb-4">
          {aviso}
        </Aviso>
      )}

      <nav aria-label="Periodo" className="mb-4 flex flex-wrap gap-2 text-sm">
        {periodos.map((p) => (
          <Link
            key={p.valor}
            href={p.valor === "12m" ? "/admin/finanzas" : `/admin/finanzas?periodo=${p.valor}`}
            aria-current={p.valor === actual ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 ring-1 transition-colors",
              p.valor === actual ? "bg-tinta text-white ring-tinta" : "ring-linea hover:bg-niebla",
            )}
          >
            {p.texto}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDato
          titulo="Ingresos"
          valor={formatearPrecio(r.ingresos)}
          detalle={plural(r.numIngresos, "ingreso", "ingresos")}
          icono={ArrowUpRight}
        />
        <TarjetaDato
          titulo="Gastos"
          valor={formatearPrecio(r.gastos)}
          detalle={plural(r.numGastos, "gasto", "gastos")}
          icono={ArrowDownRight}
        />
        <TarjetaDato
          titulo={r.beneficio >= 0 ? "Beneficio" : "Pérdidas"}
          valor={conSigno(r.beneficio)}
          detalle={mesEnCurso ? `Este mes: ${conSigno(mesEnCurso.beneficio)}` : "Ingresos − gastos"}
          icono={Wallet}
        />
        <TarjetaDato
          titulo="Margen"
          valor={r.margen === null ? "—" : `${Math.round(r.margen)} %`}
          detalle="De cada 100 € que entran, lo que queda"
          icono={Percent}
        />
      </div>

      {vacio && (
        <Aviso tipo="info" className="mt-6">
          Todavía no hay movimientos en este periodo. Apunta el primer gasto (por ejemplo, la compra
          de componentes) con el botón «Gasto» de arriba y aquí empezarán a salir las cuentas.
        </Aviso>
      )}

      <Caja titulo="Ingresos y gastos de cada mes" className="mt-6">
        <GraficoIngresosGastos meses={r.meses} />
      </Caja>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Caja titulo="Beneficio de cada mes">
          <GraficoBeneficio meses={r.meses} />
        </Caja>
        <Caja titulo="Dinero acumulado">
          <GraficoAcumulado meses={r.meses} />
        </Caja>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Caja titulo="En qué se va el dinero" sinRelleno>
          <ListaConBarras
            filas={r.gastosPorCategoria}
            formato={formatearPrecio}
            vacia="Todavía no hay gastos en este periodo."
          />
        </Caja>
        <Caja titulo="De dónde viene el dinero" sinRelleno>
          <ListaConBarras
            filas={r.ingresosPorCategoria}
            formato={formatearPrecio}
            vacia="Todavía no hay ingresos en este periodo."
          />
        </Caja>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaDato
          titulo="Mejor mes"
          valor={r.mejorMes ? conSigno(r.mejorMes.beneficio) : "—"}
          detalle={r.mejorMes ? mesLargo(r.mejorMes.mes) : "Sin movimientos"}
          icono={TrendingUp}
        />
        <TarjetaDato
          titulo="Peor mes"
          valor={r.peorMes ? conSigno(r.peorMes.beneficio) : "—"}
          detalle={r.peorMes ? mesLargo(r.peorMes.mes) : "Hace falta más de un mes"}
          icono={ArrowDownRight}
        />
        <TarjetaDato
          titulo="Gasto medio al mes"
          valor={formatearPrecio(r.gastoMedioMensual)}
          detalle="Desde el primer movimiento"
          icono={Receipt}
        />
        <TarjetaDato
          titulo="Ventas en la web"
          valor={d.pedidosWeb}
          detalle="Pedidos cobrados de verdad en este periodo"
          icono={ArrowUpRight}
          href="/admin/pedidos"
        />
      </div>

      <Caja titulo="IVA y beneficio real" className="mt-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gris">IVA cobrado en las ventas</dt>
            <dd className="mt-1 font-titulo text-xl tabular-nums">
              {formatearPrecio(r.ivaCobrado)}
            </dd>
          </div>
          <div>
            <dt className="text-gris">IVA pagado en las compras</dt>
            <dd className="mt-1 font-titulo text-xl tabular-nums">
              {formatearPrecio(r.ivaPagado)}
            </dd>
          </div>
          <div>
            <dt className="text-gris">
              {r.ivaCobrado >= r.ivaPagado
                ? "IVA a pagar a Hacienda"
                : "IVA a devolver o compensar"}
            </dt>
            <dd className="mt-1 font-titulo text-xl tabular-nums">
              {formatearPrecio(Math.abs(r.ivaCobrado - r.ivaPagado))}
            </dd>
          </div>
          <div>
            <dt className="text-gris">Beneficio sin IVA</dt>
            <dd className="mt-1 font-titulo text-xl tabular-nums">{conSigno(r.beneficioSinIva)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-gris">
          El IVA no es dinero de la empresa: el que se cobra se paga a Hacienda y el que se paga se
          descuenta. Por eso el «beneficio sin IVA» es lo que de verdad se gana. Son cifras
          orientativas: la declaración la hace la gestoría.
        </p>
      </Caja>

      <Caja titulo="Mes a mes" className="mt-6" sinRelleno>
        <Tabla
          columnas={["Mes", "Ingresos", "Gastos", "Beneficio", "Acumulado"]}
          etiqueta="Mes a mes"
        >
          {[...r.meses].reverse().map((m) => (
            <tr key={m.mes}>
              <td className="font-medium whitespace-nowrap first-letter:uppercase">
                {mesLargo(m.mes)}
              </td>
              <td className="tabular-nums">{formatearPrecio(m.ingresos)}</td>
              <td className="tabular-nums">{formatearPrecio(m.gastos)}</td>
              <td className={cn("tabular-nums", m.beneficio < 0 && "text-error-oscuro")}>
                {conSigno(m.beneficio)}
              </td>
              <td className={cn("tabular-nums", m.acumulado < 0 && "text-error-oscuro")}>
                {conSigno(m.acumulado)}
              </td>
            </tr>
          ))}
        </Tabla>
      </Caja>

      <Caja
        titulo="Movimientos"
        className="mt-6"
        sinRelleno
        acciones={
          d.movimientos.length > 0 && (
            <BotonAdmin
              href={`/admin/finanzas/csv?periodo=${actual}`}
              variante="secundario"
              pequeno
              prefetch={false}
            >
              <Download aria-hidden="true" className="size-4" />
              Descargar (Excel)
            </BotonAdmin>
          )
        }
      >
        <Tabla
          columnas={["Fecha", "Concepto", "Categoría", "Importe", ""]}
          etiqueta="Movimientos"
          vacia={d.movimientos.length === 0 && "No hay movimientos en este periodo."}
        >
          {d.movimientos.slice(0, MAXIMO_LISTA).map((m) => (
            <tr key={`${m.origen}-${m.id}`}>
              <td className="whitespace-nowrap text-gris">{fecha(m.fecha)}</td>
              <td>
                <span className="font-medium">{m.concepto}</span>
                {m.contraparte && <span className="block text-xs text-gris">{m.contraparte}</span>}
              </td>
              <td className="text-gris">{nombreCategoria(m.categoria)}</td>
              <td
                className={cn(
                  "font-medium whitespace-nowrap tabular-nums",
                  m.tipo === "INGRESO" ? "text-exito" : "text-tinta",
                )}
              >
                {m.tipo === "INGRESO" ? "+" : "−"}
                {formatearPrecio(m.importeCentimos)}
              </td>
              <td className="text-right">
                <BotonAdmin href={m.href} variante="suave" pequeno>
                  {m.origen === "pedido" ? "Ver pedido" : "Cambiar"}
                </BotonAdmin>
              </td>
            </tr>
          ))}
        </Tabla>
        {d.movimientos.length > MAXIMO_LISTA && (
          <p className="border-t border-linea px-5 py-3 text-xs text-gris">
            Se ven los {MAXIMO_LISTA} más recientes de {d.movimientos.length}. La descarga para
            Excel los lleva todos.
          </p>
        )}
      </Caja>
    </>
  );
}
