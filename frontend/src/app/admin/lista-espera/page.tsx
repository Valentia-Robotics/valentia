import type { Metadata } from "next";
import { Download } from "lucide-react";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { CopiarEmails } from "@/components/admin/CopiarEmails";
import { Tabla } from "@/components/admin/Tabla";
import { fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";
import { borrarDeListaEspera } from "./acciones";

export const metadata: Metadata = { title: "Lista de espera" };

const DONDE: Record<string, string> = {
  portada: "Portada",
  kit: "Ficha de kit",
  checkout: "Al intentar pagar",
};

/** LISTA DE ESPERA: quién quiere que le avisemos cuando abra la tienda */
export default async function ListaEsperaAdmin() {
  await exigirAdmin("/admin/lista-espera");
  const [filas, kits] = await Promise.all([
    db.listaEspera.findMany({ orderBy: { creadoEn: "desc" }, take: 2000 }),
    db.kit.findMany({ select: { slug: true, nombre: true } }),
  ]);
  const nombreKit = new Map(kits.map((k) => [k.slug, k.nombre]));

  return (
    <>
      <Cabecera
        titulo="Lista de espera"
        descripcion={`${plural(filas.length, "persona quiere", "personas quieren")} que les avisemos cuando abra la tienda.`}
        acciones={
          filas.length > 0 && (
            <>
              <CopiarEmails emails={filas.map((f) => f.email)} />
              <BotonAdmin href="/admin/lista-espera/csv" variante="secundario" prefetch={false}>
                <Download aria-hidden="true" className="size-4" />
                Descargar (Excel)
              </BotonAdmin>
            </>
          )
        }
      />
      <Caja sinRelleno>
        <Tabla
          columnas={["Email", "Kit que miraba", "Dónde se apuntó", "Fecha", ""]}
          etiqueta="Lista de espera"
          vacia={
            filas.length === 0 &&
            "Todavía no se ha apuntado nadie. El formulario sale en la portada, en cada kit y al intentar pagar mientras la tienda esté cerrada."
          }
        >
          {filas.map((f) => (
            <tr key={f.id}>
              <td className="font-medium">{f.email}</td>
              <td className="text-gris">
                {f.kitSlug ? (nombreKit.get(f.kitSlug) ?? f.kitSlug) : "—"}
              </td>
              <td className="text-gris">{DONDE[f.origen] ?? f.origen}</td>
              <td className="whitespace-nowrap text-gris">{fechaHora(f.creadoEn)}</td>
              <td className="text-right">
                <BotonConfirmar
                  accion={borrarDeListaEspera}
                  datos={{ id: f.id }}
                  titulo="¿Borrar este email de la lista?"
                  texto={`${f.email} dejará de estar en la lista de espera.`}
                  variante="suave"
                  pequeno
                >
                  Borrar
                </BotonConfirmar>
              </td>
            </tr>
          ))}
        </Tabla>
      </Caja>
      {filas.length > 0 && (
        <p className="mt-4 text-sm text-gris">
          Cuando abráis, copia los emails y mandad un único correo a todos con copia oculta (CCO),
          para que nadie vea las direcciones de los demás. Después podéis borrar la lista.
        </p>
      )}
    </>
  );
}
