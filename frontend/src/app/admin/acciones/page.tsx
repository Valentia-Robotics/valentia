import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { borrarValoracion } from "./acciones";
import { Aviso } from "@/components/admin/Aviso";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioValoracion } from "@/components/admin/FormularioValoracion";
import { Tabla } from "@/components/admin/Tabla";
import {
  formatearValorAccion,
  repartoSocios,
  TOTAL_ACCIONES,
  valorAccion,
} from "@/config/acciones";
import { obtenerAcciones } from "@/lib/admin/acciones";
import { fechaHora } from "@/lib/admin/formato";
import { exigirAdmin } from "@/lib/sesion";
import { formatearNumero, formatearPrecio } from "@/lib/utils";

export const metadata: Metadata = { title: "Acciones" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** ACCIONES: cuánto vale una acción de la empresa y lo de cada socio (solo ADMIN y SIGMA) */
export default async function AccionesAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/acciones");
  const parametros = await searchParams;
  const { calculado, actual, historial } = await obtenerAcciones();

  const aMano = actual ? repartoSocios(actual.importeCentimos) : null;
  const segunNumeros = repartoSocios(calculado.total);
  const aviso = parametros.guardado
    ? "Valor guardado."
    : parametros.borrado
      ? "Valor borrado."
      : undefined;

  return (
    <>
      <Cabecera
        titulo="Acciones"
        descripcion={`Cuánto vale una acción de la empresa y lo que vale lo de cada socio. ${formatearNumero(TOTAL_ACCIONES)} acciones en total.`}
      />
      {aviso && (
        <Aviso tipo="exito" className="mb-4">
          {aviso}
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Valor
          titulo="Valor de una acción (a mano)"
          valor={actual ? formatearValorAccion(valorAccion(actual.importeCentimos)) : "—"}
          detalle={
            actual
              ? `Empresa: ${formatearPrecio(actual.importeCentimos)} · ${fechaHora(actual.creadoEn)}`
              : "Aún no habéis escrito cuánto vale la empresa."
          }
        />
        <Valor
          titulo="Valor de una acción (según los números)"
          valor={formatearValorAccion(valorAccion(calculado.total))}
          detalle={`Empresa: ${formatearPrecio(calculado.total)} · se actualiza solo`}
        />
      </div>

      <Caja titulo="Socios" className="mt-4" sinRelleno>
        <Tabla
          etiqueta="Socios"
          columnas={["Socio", "Parte", "Acciones", "Valor (a mano)", "Valor (según los números)"]}
        >
          {segunNumeros.map((s, i) => (
            <tr key={s.nombre}>
              <td className="font-medium">{s.nombre}</td>
              <td className="tabular-nums">{formatearNumero(s.porcentaje)} %</td>
              <td className="tabular-nums">{formatearNumero(s.acciones)}</td>
              <td className="font-medium tabular-nums">
                {aMano ? formatearPrecio(aMano[i].valorCentimos) : "—"}
              </td>
              <td className="tabular-nums">{formatearPrecio(s.valorCentimos)}</td>
            </tr>
          ))}
        </Tabla>
      </Caja>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Caja titulo="Cambiar el valor de la empresa">
          <p className="mb-4 text-sm text-gris">
            Escribe cuánto vale toda la empresa (por ejemplo, lo que os ofrece un inversor o lo que
            dice vuestro gestor). La web lo reparte entre las {formatearNumero(TOTAL_ACCIONES)}{" "}
            acciones. El valor anterior se queda en el historial.
          </p>
          <FormularioValoracion />
        </Caja>

        <Caja titulo="Cómo sale el valor «según los números»">
          <dl className="space-y-2 text-sm">
            <Fila
              etiqueta="Lo ganado desde el principio, sin IVA"
              ayuda="Ingresos − gastos de Finanzas («Todo»)"
              valor={calculado.beneficioAcumulado}
            />
            <Fila
              etiqueta="Lo que hay en el almacén"
              ayuda="Kits y componentes a precio de venta sin IVA"
              valor={calculado.valorStock}
            />
            <div className="border-t border-linea pt-2">
              <Fila etiqueta="Valor de la empresa" valor={calculado.total} fuerte />
            </div>
          </dl>
          <p className="mt-4 text-xs text-gris">
            Es solo una referencia: no cuenta lo que vale la marca, los cursos ni lo que puede
            crecer la empresa. Por eso suele ser menor que el valor que se pone a mano.
          </p>
        </Caja>
      </div>

      <Caja titulo="Historial de valores" className="mt-4" sinRelleno>
        <Tabla
          etiqueta="Historial de valores"
          columnas={["Fecha", "Valor de la empresa", "Una acción", "Nota", "Apuntado por", ""]}
          vacia={historial.length === 0 ? "Todavía no hay ningún valor apuntado." : undefined}
        >
          {historial.map((v) => (
            <tr key={v.id}>
              <td className="whitespace-nowrap">{fechaHora(v.creadoEn)}</td>
              <td className="font-medium tabular-nums">{formatearPrecio(v.importeCentimos)}</td>
              <td className="tabular-nums">
                {formatearValorAccion(valorAccion(v.importeCentimos))}
              </td>
              <td className="text-gris">{v.nota || "—"}</td>
              <td className="text-gris">{v.creadoPor || "—"}</td>
              <td className="text-right">
                <BotonConfirmar
                  accion={borrarValoracion}
                  datos={{ valoracionId: v.id }}
                  titulo="¿Borrar este valor?"
                  texto="Desaparecerá del historial. Si es el último, pasará a contar el anterior."
                  variante="suave"
                  pequeno
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  <span className="sr-only">Borrar</span>
                </BotonConfirmar>
              </td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}

/** Cifra grande arriba de la página */
function Valor({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-linea">
      <p className="text-[13px] text-gris">{titulo}</p>
      <p className="mt-2 font-titulo text-3xl font-medium tabular-nums">{valor}</p>
      <p className="mt-1 text-xs text-gris">{detalle}</p>
    </div>
  );
}

/** Una línea del desglose del valor calculado */
function Fila({
  etiqueta,
  ayuda,
  valor,
  fuerte,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: number;
  fuerte?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt>
        <span className={fuerte ? "font-semibold" : undefined}>{etiqueta}</span>
        {ayuda && <span className="block text-xs text-gris">{ayuda}</span>}
      </dt>
      <dd className={`tabular-nums ${fuerte ? "font-semibold" : ""}`}>{formatearPrecio(valor)}</dd>
    </div>
  );
}
