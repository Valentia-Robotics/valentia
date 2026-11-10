import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { FormularioMovimiento } from "@/components/admin/FormularioMovimiento";
import { diaEnEspana } from "@/config/finanzas";
import { fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { esId } from "@/lib/ids";
import { exigirAdmin } from "@/lib/sesion";
import { borrarMovimiento } from "../acciones";

export const metadata: Metadata = { title: "Cambiar apunte" };

interface Props {
  params: Promise<{ id: string }>;
}

/** CAMBIAR O BORRAR UN INGRESO O UN GASTO */
export default async function EditarMovimiento({ params }: Props) {
  const { id } = await params;
  await exigirAdmin(`/admin/finanzas/${id}`);
  if (!esId(id)) notFound();
  const m = await db.movimientoDinero.findUnique({ where: { id } });
  if (!m) notFound();

  return (
    <>
      <Cabecera
        titulo={m.tipo === "INGRESO" ? "Cambiar ingreso" : "Cambiar gasto"}
        descripcion={`Apuntado ${m.creadoPor ? `por ${m.creadoPor} ` : ""}el ${fechaHora(m.creadoEn)}.`}
        volver={{ href: "/admin/finanzas", etiqueta: "Finanzas" }}
        acciones={
          <BotonConfirmar
            accion={borrarMovimiento}
            datos={{ movimientoId: m.id }}
            titulo="¿Borrar este apunte?"
            texto={`«${m.concepto}» dejará de contar en las cuentas. No se puede deshacer.`}
            variante="peligro"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Borrar
          </BotonConfirmar>
        }
      />
      <FormularioMovimiento
        movimiento={{
          id: m.id,
          tipo: m.tipo,
          concepto: m.concepto,
          categoria: m.categoria,
          importeCentimos: m.importeCentimos,
          ivaPorcentaje: m.ivaPorcentaje,
          dia: diaEnEspana(m.fecha),
          contraparte: m.contraparte,
          notas: m.notas,
        }}
      />
    </>
  );
}
