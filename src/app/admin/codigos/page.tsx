import type { Metadata } from "next";
import Link from "next/link";
import { Printer } from "lucide-react";
import { cambiarDesactivacion } from "@/app/admin/codigos/acciones";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Buscador } from "@/components/admin/Buscador";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { FormularioLote } from "@/components/admin/FormularioLote";
import { Insignia } from "@/components/admin/Insignia";
import { leerPagina, Paginacion } from "@/components/admin/Paginacion";
import { Tabla } from "@/components/admin/Tabla";
import {
  listarCodigos,
  MAXIMO_LOTE,
  resumenCodigos,
  ultimosLotes,
  type EstadoCodigo,
} from "@/lib/admin/codigos";
import { fecha, fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";
import { cn, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Códigos" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const ESTADOS: { id?: EstadoCodigo; nombre: string }[] = [
  { nombre: "Todos" },
  { id: "libre", nombre: "Sin usar" },
  { id: "usado", nombre: "Usados" },
  { id: "desactivado", nombre: "Desactivados" },
];

const texto = (valor: unknown) => (typeof valor === "string" && valor ? valor : undefined);

/**
 * CÓDIGOS DE ACTIVACIÓN: generar lotes para imprimir, y ver quién ha usado cada código y cuándo.
 * Filtros en la dirección: ?kit=…&estado=libre|usado|desactivado&q=…&lote=…
 */
export default async function CodigosAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/codigos");
  const p = await searchParams;
  const q = texto(p.q) ?? "";
  const kitId = texto(p.kit);
  const loteId = texto(p.lote);
  const estado = ESTADOS.find((e) => e.id && e.id === p.estado)?.id;
  const pagina = leerPagina(p.pagina);

  const [kits, resumen, lotes, { codigos, total, totalPaginas }] = await Promise.all([
    db.kit.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    resumenCodigos(),
    ultimosLotes(),
    listarCodigos({ q, kitId, estado, loteId, pagina }),
  ]);
  const filtros = { q: q || undefined, kit: kitId, estado, lote: loteId };
  const enlace = (cambios: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries({ ...filtros, ...cambios })) {
      if (valor) params.set(clave, valor);
    }
    const t = params.toString();
    return `/admin/codigos${t ? `?${t}` : ""}`;
  };
  const chip = (activo: boolean) =>
    cn(
      "rounded-md px-2.5 py-1 ring-1",
      activo ? "bg-tinta text-white ring-tinta" : "bg-white ring-linea hover:ring-tinta/40",
    );

  return (
    <>
      <Cabecera
        titulo="Códigos de activación"
        descripcion={`${resumen.generados} generados · ${resumen.usados} usados · ${resumen.desactivados} desactivados`}
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Caja titulo="Generar códigos para imprimir">
          <FormularioLote kits={kits} kitInicial={kitId} maximo={MAXIMO_LOTE} />
        </Caja>
        <Caja titulo="Últimos lotes" sinRelleno>
          <ul className="divide-y divide-linea text-sm">
            {lotes.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
              >
                <div className="min-w-0">
                  <Link
                    href={enlace({ lote: l.id, pagina: undefined })}
                    className="font-medium hover:underline"
                  >
                    {plural(l.cantidad, "código", "códigos")} · {l.kit.nombre}
                  </Link>
                  <p className="text-xs text-gris">
                    {fechaHora(l.creadoEn)} · {l.usados} usados
                  </p>
                </div>
                <BotonAdmin href={`/admin/codigos/lotes/${l.id}`} variante="secundario" pequeno>
                  <Printer aria-hidden="true" className="size-4" />
                  Tarjetas
                </BotonAdmin>
              </li>
            ))}
            {lotes.length === 0 && (
              <li className="px-5 py-6 text-center text-gris">
                Todavía no has generado ningún lote.
              </li>
            )}
          </ul>
        </Caja>
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="mb-4 space-y-3">
        <Buscador
          valor={q}
          placeholder="Buscar por código o por email"
          etiqueta="Buscar códigos"
          extra={{ kit: kitId, estado, lote: loteId }}
        />
        <div className="flex flex-wrap gap-1.5 text-[13px]">
          {ESTADOS.map((e) => (
            <Link
              key={e.nombre}
              href={enlace({ estado: e.id, pagina: undefined })}
              className={chip(estado === e.id)}
            >
              {e.nombre}
            </Link>
          ))}
          <span className="mx-1 w-px bg-linea" aria-hidden="true" />
          {[{ id: undefined, nombre: "Todos los kits" }, ...kits].map((k) => (
            <Link
              key={k.nombre}
              href={enlace({ kit: k.id, pagina: undefined })}
              className={chip(kitId === k.id)}
            >
              {k.nombre}
            </Link>
          ))}
          {loteId && (
            <Link href={enlace({ lote: undefined })} className={chip(true)}>
              Solo un lote ✕
            </Link>
          )}
        </div>
      </div>

      <Caja sinRelleno>
        <p className="border-b border-linea px-4 py-2 text-xs text-gris">
          {plural(total, "código", "códigos")}
        </p>
        <Tabla
          columnas={["Código", "Kit", "Estado", "Usado por", "Origen", ""]}
          vacia={codigos.length === 0 && "No hay códigos con estos filtros."}
        >
          {codigos.map((c) => (
            <tr key={c.id}>
              <td className="font-mono text-[13px] font-medium whitespace-nowrap">{c.codigo}</td>
              <td className="whitespace-nowrap">{c.kit.nombre}</td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {c.usadoEn ? (
                    <Insignia tono="exito">Usado</Insignia>
                  ) : (
                    !c.desactivadoEn && <Insignia>Sin usar</Insignia>
                  )}
                  {c.desactivadoEn && <Insignia tono="error">Desactivado</Insignia>}
                </div>
              </td>
              <td>
                {c.usadoEn && c.usuario ? (
                  <>
                    <Link
                      href={`/admin/usuarios?q=${encodeURIComponent(c.usuario.email)}`}
                      className="hover:underline"
                    >
                      {c.usuario.email}
                    </Link>
                    <p className="text-xs text-gris">{fechaHora(c.usadoEn)}</p>
                  </>
                ) : c.usadoEn ? (
                  <span className="text-gris">Cuenta borrada · {fechaHora(c.usadoEn)}</span>
                ) : (
                  <span className="text-gris">—</span>
                )}
              </td>
              <td className="text-xs whitespace-nowrap text-gris">
                {c.pedido ? (
                  <Link href={`/pedido/${c.pedido.id}`} className="font-mono hover:underline">
                    {c.pedido.numero}
                  </Link>
                ) : c.loteId ? (
                  <Link href={`/admin/codigos/lotes/${c.loteId}`} className="hover:underline">
                    Lote del {fecha(c.creadoEn)}
                  </Link>
                ) : (
                  "Prueba"
                )}
              </td>
              <td>
                <div className="flex justify-end">
                  {c.desactivadoEn ? (
                    <BotonConfirmar
                      accion={cambiarDesactivacion}
                      datos={{ id: c.id }}
                      titulo="¿Reactivar este código?"
                      texto={
                        <>
                          El código <strong className="font-mono">{c.codigo}</strong> volverá a
                          servir para activar el curso.
                        </>
                      }
                      confirmar="Sí, reactivar"
                      variante="suave"
                      pequeno
                    >
                      Reactivar
                    </BotonConfirmar>
                  ) : (
                    <BotonConfirmar
                      accion={cambiarDesactivacion}
                      datos={{ id: c.id }}
                      titulo="¿Desactivar este código?"
                      texto={
                        <>
                          El código <strong className="font-mono">{c.codigo}</strong> dejará de
                          servir.
                          {c.usadoEn
                            ? " Quien ya lo activó conserva su curso."
                            : " Úsalo si una tarjeta se ha perdido o se ha impreso mal."}{" "}
                          Podrás reactivarlo después.
                        </>
                      }
                      confirmar="Sí, desactivar"
                      variante="suave"
                      pequeno
                    >
                      Desactivar
                    </BotonConfirmar>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
        <Paginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          ruta="/admin/codigos"
          filtros={filtros}
        />
      </Caja>
    </>
  );
}
