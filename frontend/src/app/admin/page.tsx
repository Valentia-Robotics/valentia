import Link from "next/link";
import { BookOpen, Boxes, PackageSearch, QrCode, ShoppingBag, UserPlus, Users } from "lucide-react";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { EstadoPedido } from "@/components/admin/EstadoPedido";
import { Insignia } from "@/components/admin/Insignia";
import { TarjetaDato } from "@/components/admin/TarjetaDato";
import { DIAS_ACTIVIDAD, obtenerResumen } from "@/lib/admin/estadisticas";
import { fecha, fechaHora, porcentaje } from "@/lib/admin/formato";
import { exigirAdmin } from "@/lib/sesion";
import { contarPorReponer } from "@/lib/stock/stock";
import { formatearPrecio, plural } from "@/lib/utils";

/** INICIO DEL PANEL: las cifras principales y lo último que ha pasado */
export default async function InicioAdmin() {
  const admin = await exigirAdmin("/admin");
  const [r, porReponer] = await Promise.all([obtenerResumen(), contarPorReponer()]);

  return (
    <>
      <Cabecera titulo={`Hola, ${admin.nombre.split(" ")[0]}`} descripcion="Así va Valentia hoy." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <TarjetaDato
          titulo="Usuarios registrados"
          valor={r.usuarios}
          icono={Users}
          href="/admin/usuarios"
        />
        <TarjetaDato titulo="Nuevos este mes" valor={r.usuariosMes} icono={UserPlus} />
        <TarjetaDato
          titulo="Pedidos"
          valor={r.pedidos}
          detalle={`${r.pedidosPagados} pagados`}
          icono={ShoppingBag}
        />
        <TarjetaDato
          titulo="Kits vendidos"
          valor={r.kitsVendidos}
          detalle="Unidades en pedidos pagados"
          icono={Boxes}
          href="/admin/kits"
        />
        <TarjetaDato
          titulo="Códigos activados"
          valor={`${r.codigosActivados} / ${r.codigosGenerados}`}
          detalle={`${porcentaje(r.codigosActivados, r.codigosGenerados)} de los generados`}
          icono={QrCode}
          href="/admin/codigos"
        />
        <TarjetaDato
          titulo="Curso más activo"
          valor={r.cursosActivos[0]?.leccionesCompletadas ? r.cursosActivos[0].titulo : "—"}
          detalle={`Últimos ${DIAS_ACTIVIDAD} días`}
          icono={BookOpen}
          href="/admin/cursos"
        />
        <TarjetaDato
          titulo="Por reponer"
          valor={porReponer}
          detalle={
            porReponer > 0 ? "Productos con stock bajo o sin unidades" : "Todo el stock está bien"
          }
          icono={PackageSearch}
          href="/stock"
        />
      </div>

      <Caja
        titulo={`Cursos más activos (últimos ${DIAS_ACTIVIDAD} días)`}
        className="mt-6"
        sinRelleno
      >
        <ul className="divide-y divide-linea text-sm">
          {r.cursosActivos.map((curso) => (
            <li
              key={curso.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
            >
              <Link href={`/admin/cursos/${curso.id}`} className="font-medium hover:underline">
                {curso.titulo}
              </Link>
              <span className="text-gris">
                {plural(curso.leccionesCompletadas, "lección completada", "lecciones completadas")}{" "}
                · {plural(curso.alumnosActivos, "alumno activo", "alumnos activos")} de{" "}
                {curso.alumnosTotales}
              </span>
            </li>
          ))}
          {r.cursosActivos.length === 0 && (
            <li className="px-5 py-6 text-center text-gris">Todavía no hay cursos.</li>
          )}
        </ul>
      </Caja>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Caja titulo="Últimos pedidos" sinRelleno>
          <ul className="divide-y divide-linea text-sm">
            {r.ultimosPedidos.map((pedido) => (
              <li
                key={pedido.id}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/pedidos/${pedido.id}`}
                    className="font-mono text-[13px] font-medium hover:underline"
                  >
                    {pedido.numero}
                  </Link>
                  <p className="truncate text-xs text-gris">
                    {pedido.nombre} · {pedido.email} · {fechaHora(pedido.creadoEn)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <EstadoPedido estado={pedido.estado} />
                  <span className="tabular-nums">{formatearPrecio(pedido.totalCentimos)}</span>
                </div>
              </li>
            ))}
            {r.ultimosPedidos.length === 0 && (
              <li className="px-5 py-6 text-center text-gris">Todavía no hay pedidos.</li>
            )}
          </ul>
        </Caja>

        <Caja
          titulo="Últimos registros"
          acciones={
            <Link href="/admin/usuarios" className="text-xs text-acento hover:underline">
              Ver todos
            </Link>
          }
          sinRelleno
        >
          <ul className="divide-y divide-linea text-sm">
            {r.ultimosUsuarios.map((usuario) => (
              <li
                key={usuario.id}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {usuario.nombre}{" "}
                    {usuario.rol === "ADMIN" && <Insignia tono="acento">Admin</Insignia>}
                  </p>
                  <p className="truncate text-xs text-gris">{usuario.email}</p>
                </div>
                <span className="shrink-0 text-xs text-gris">{fecha(usuario.creadoEn)}</span>
              </li>
            ))}
          </ul>
        </Caja>
      </div>
    </>
  );
}
