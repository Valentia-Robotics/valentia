import type { Metadata } from "next";
import Link from "next/link";
import { Printer } from "lucide-react";
import { cambiarDesactivacion, cambiarDesactivacionTodos } from "@/app/admin/codigos/acciones";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Buscador } from "@/components/admin/Buscador";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { DescargaBienvenida } from "@/components/admin/DescargaBienvenida";
import { FormularioLote } from "@/components/admin/FormularioLote";
import { Insignia } from "@/components/admin/Insignia";
import { leerPagina, Paginacion } from "@/components/admin/Paginacion";
import { Tabla } from "@/components/admin/Tabla";
import {
  contarParaBloque,
  listarCodigos,
  MAXIMO_LOTE,
  resumenBienvenida,
  resumenCodigos,
  ultimosLotes,
  type EstadoCodigo,
} from "@/lib/admin/codigos";
import { fecha, fechaHora } from "@/lib/admin/formato";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";
import { MAXIMO_TARJETAS_BIENVENIDA } from "@/config/bienvenida";
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

  const [kits, resumen, lotes, { codigos, total, totalPaginas }, bloque, bienvenida] =
    await Promise.all([
      db.kit.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
      resumenCodigos(),
      ultimosLotes(),
      listarCodigos({ q, kitId, estado, loteId, pagina }),
      contarParaBloque({ q, kitId, estado, loteId }),
      resumenBienvenida(),
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
  // Datos de los botones «Desactivar todos» / «Reactivar todos»: los filtros que se ven ahora
  const datosBloque = { q, kit: kitId ?? "", lote: loteId ?? "", estado: estado ?? "" };
  const hayFiltros = Boolean(q || kitId || loteId || estado);
  const queCodigos = hayFiltros
    ? "los que ves con estos filtros"
    : "todos los códigos de la tienda";
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

      {/* ---------- Tarjetas de bienvenida (presentaciones, eventos…) ---------- */}
      {bienvenida && (
        <Caja titulo="Tarjetas de bienvenida" className="mb-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="space-y-3">
              <p className="text-sm text-gris">
                Cada tarjeta lleva su propio código. Quien la escanea crea su cuenta y va directo al
                vídeo de bienvenida; con ese código no se abre ningún otro curso.
              </p>
              <DescargaBienvenida maximo={MAXIMO_TARJETAS_BIENVENIDA} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center lg:w-72">
              <div className="rounded-lg bg-niebla p-3">
                <p className="text-xs text-gris">Tarjetas hechas</p>
                <p className="font-titulo text-2xl">{bienvenida.generadas}</p>
              </div>
              <Link
                href={enlace({
                  kit: bienvenida.kitId,
                  estado: "usado",
                  lote: undefined,
                  q: undefined,
                  pagina: undefined,
                })}
                className="rounded-lg bg-niebla p-3 ring-linea hover:ring-1"
              >
                <p className="text-xs text-gris">Personas registradas</p>
                <p className="font-titulo text-2xl text-acento">{bienvenida.usadas}</p>
              </Link>
            </div>
          </div>
        </Caja>
      )}

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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-2">
          <p className="text-xs text-gris">{plural(total, "código", "códigos")}</p>
          {/* Desactivar o reactivar de una vez todos los códigos de los filtros elegidos */}
          <div className="flex flex-wrap gap-2">
            {bloque.activos > 0 && (
              <BotonConfirmar
                accion={cambiarDesactivacionTodos}
                datos={{ ...datosBloque, modo: "desactivar" }}
                titulo={`¿Desactivar ${plural(bloque.activos, "código", "códigos")}?`}
                texto={
                  <>
                    Se desactivarán <strong>{queCodigos}</strong> que aún funcionan (
                    {plural(bloque.activos, "código", "códigos")}). Dejarán de servir para activar
                    el curso. Quien ya activó el suyo conserva su curso. Podrás reactivarlos después
                    con «Reactivar todos».
                  </>
                }
                confirmar={`Sí, desactivar ${bloque.activos}`}
                variante="peligro"
                pequeno
              >
                {hayFiltros ? "Desactivar estos" : "Desactivar todos"} ({bloque.activos})
              </BotonConfirmar>
            )}
            {bloque.desactivados > 0 && (
              <BotonConfirmar
                accion={cambiarDesactivacionTodos}
                datos={{ ...datosBloque, modo: "reactivar" }}
                titulo={`¿Reactivar ${plural(bloque.desactivados, "código", "códigos")}?`}
                texto={
                  <>
                    Volverán a servir para activar el curso <strong>{queCodigos}</strong> que están
                    desactivados ({plural(bloque.desactivados, "código", "códigos")}).
                  </>
                }
                confirmar={`Sí, reactivar ${bloque.desactivados}`}
                variante="suave"
                pequeno
              >
                {hayFiltros ? "Reactivar estos" : "Reactivar todos"} ({bloque.desactivados})
              </BotonConfirmar>
            )}
          </div>
        </div>
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
