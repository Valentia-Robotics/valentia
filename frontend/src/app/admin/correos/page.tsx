import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioNovedades } from "@/components/admin/FormularioNovedades";
import { RefrescoMientrasEnvia } from "@/components/admin/RefrescoMientrasEnvia";
import { Tabla } from "@/components/admin/Tabla";
import { envioCortado } from "@/config/novedades";
import { fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { listarCorreosNovedades, resumenDestinatarios } from "@/lib/novedades/novedades";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";
import { seguirEnviando } from "./acciones";

export const metadata: Metadata = { title: "Correos a clientes" };

/**
 * CORREOS A CLIENTES: anunciar un kit nuevo o cualquier novedad por correo.
 * Solo llegan a quien pidió recibirlos (src/config/novedades.ts); cada uno lleva su enlace de baja.
 */
export default async function CorreosAdmin() {
  await exigirAdmin("/admin/correos");
  const [resumen, correos, kits] = await Promise.all([
    resumenDestinatarios(),
    listarCorreosNovedades(),
    db.kit.findMany({
      where: { visible: true },
      select: { slug: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  const ahora = new Date();
  const enMarcha = correos.some((c) => !c.terminadoEn && !envioCortado(c, ahora));

  return (
    <>
      <RefrescoMientrasEnvia activo={enMarcha} />
      <Cabecera
        titulo="Correos a clientes"
        descripcion={`${plural(resumen.si, "persona quiere", "personas quieren")} recibir novedades · ${plural(resumen.no, "ha dicho", "han dicho")} que no · ${resumen.sinDecir} aún no lo ${resumen.sinDecir === 1 ? "ha dicho" : "han dicho"}.`}
      />
      <p className="mb-6 max-w-3xl text-sm text-gris">
        Por ley, solo les llega a quienes marcaron «Avisadme por correo» al registrarse, en «Mi
        cuenta» o en la pregunta de «Mis cursos». Cada correo lleva un enlace para darse de baja y
        la palabra «Publicidad» arriba, como pide la LSSI.
      </p>

      <FormularioNovedades destinatarios={resumen.si} kits={kits} />

      <Caja titulo="Enviados" sinRelleno className="mt-6">
        <Tabla
          columnas={["Asunto", "Quién", "Fecha", "Cómo va", ""]}
          etiqueta="Correos enviados"
          vacia={correos.length === 0 && "Todavía no se ha mandado ningún correo de novedades."}
        >
          {correos.map((c) => {
            const cortado = envioCortado(c, ahora);
            return (
              <tr key={c.id}>
                <td className="font-medium">{c.asunto}</td>
                <td className="text-gris">{c.autor.nombre}</td>
                <td className="whitespace-nowrap text-gris">{fechaHora(c.creadoEn)}</td>
                <td className="whitespace-nowrap">
                  {c.terminadoEn
                    ? `Enviado a ${c.enviados}`
                    : cortado
                      ? `Se cortó: ${c.enviados} de ${c.total}`
                      : `Enviando… ${c.enviados} de ${c.total}`}
                  {c.fallidos > 0 && (
                    <span className="block text-xs text-error">
                      {plural(c.fallidos, "no salió", "no salieron")}
                    </span>
                  )}
                </td>
                <td className="text-right">
                  {cortado && (
                    <BotonConfirmar
                      accion={seguirEnviando}
                      datos={{ id: c.id }}
                      titulo="¿Seguimos enviando?"
                      texto="Se manda solo a quien aún no lo ha recibido. Nadie lo recibirá dos veces."
                      confirmar="Sí, seguir"
                      variante="secundario"
                      pequeno
                    >
                      Seguir enviando
                    </BotonConfirmar>
                  )}
                </td>
              </tr>
            );
          })}
        </Tabla>
      </Caja>
    </>
  );
}
