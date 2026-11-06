"use client";

import Link from "next/link";
import { Search, Send } from "lucide-react";
import { useState } from "react";
import { enviarVariosPedidos } from "@/app/admin/pedidos/acciones";
import type { PedidoPorEnviar } from "@/lib/admin/pedidos";
import { Aviso } from "./Aviso";
import { BotonAdmin } from "./BotonAdmin";
import { EstadoPedido } from "./EstadoPedido";
import { Tabla } from "./Tabla";
import { useFormulario } from "./useFormulario";

/**
 * Todos los pedidos que faltan por salir, cada uno con su casilla de número de seguimiento.
 * Escribe los de los paquetes que se lleva la agencia y pulsa un solo botón: esos pasan a
 * «Enviado» y cada cliente recibe su correo. Los que se quedan en blanco no cambian.
 */
export function FormularioEnvios({ pedidos }: { pedidos: PedidoPorEnviar[] }) {
  const { estado, alEnviar, enviando, error } = useFormulario(enviarVariosPedidos);
  const [buscar, setBuscar] = useState("");
  const palabras = normalizar(buscar).split(/\s+/).filter(Boolean);
  // Coincide si cada palabra aparece en el nombre, el email, el número o el lugar
  const coincide = (p: PedidoPorEnviar) => {
    const texto = normalizar(`${p.nombre} ${p.email} ${p.numero} ${p.lugar}`);
    return palabras.every((palabra) => texto.includes(palabra));
  };
  const visibles = pedidos.filter(coincide).length;

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-4">
      {estado.mensaje && <Aviso tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>}
      {pedidos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 print:hidden">
          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Buscar por nombre, apellidos, email o número</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-gris"
            />
            <input
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar por nombre, apellidos, email o número"
              autoComplete="off"
              className="h-9 w-full rounded-md bg-white pr-2.5 pl-8 text-sm ring-1 ring-linea focus:ring-2 focus:ring-acento focus:outline-none"
            />
          </label>
          {palabras.length > 0 && (
            <p className="text-xs text-gris" aria-live="polite">
              {visibles === 1 ? "1 pedido" : `${visibles} pedidos`} de {pedidos.length}
            </p>
          )}
        </div>
      )}
      <Tabla
        columnas={["Pedido", "Enviar a", "Qué lleva", "Número de seguimiento"]}
        etiqueta="Pedidos por enviar"
        vacia={pedidos.length === 0 && "¡Todo enviado! No queda ningún pedido pagado por salir."}
      >
        {pedidos.map((p) => {
          const campo = `seguimiento-${p.id}`;
          const fallo = error(campo);
          return (
            // Los que no coinciden se ocultan, pero lo que tengan escrito se sigue enviando
            <tr key={p.id} className="align-top" hidden={!coincide(p)}>
              <td className="whitespace-nowrap">
                <Link
                  href={`/admin/pedidos/${p.id}`}
                  className="font-mono font-medium text-acento hover:underline"
                >
                  {p.numero}
                </Link>
                <p className="mt-1 text-xs text-gris">Pagado {p.pagado}</p>
                <p className="mt-1">
                  <EstadoPedido estado={p.estado} />
                </p>
              </td>
              <td>
                <p>{p.nombre}</p>
                <p className="text-xs text-gris">{p.lugar}</p>
              </td>
              <td className="text-xs">
                {p.articulos.map((a, i) => (
                  <p key={i}>{a}</p>
                ))}
              </td>
              <td className="min-w-44">
                <input
                  name={campo}
                  aria-label={`Número de seguimiento del pedido ${p.numero}`}
                  aria-invalid={fallo ? true : undefined}
                  maxLength={60}
                  autoComplete="off"
                  className={
                    "h-9 w-full rounded-md bg-white px-2.5 text-sm ring-1 focus:ring-2 focus:ring-acento focus:outline-none " +
                    (fallo ? "ring-error" : "ring-linea")
                  }
                />
                {fallo && <p className="mt-1 text-xs text-error">{fallo}</p>}
              </td>
            </tr>
          );
        })}
      </Tabla>
      {pedidos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4 print:hidden">
          <BotonAdmin type="submit" disabled={enviando}>
            <Send aria-hidden="true" className="size-4" />
            {enviando ? "Enviando…" : "Marcar como enviados y avisar a los clientes"}
          </BotonAdmin>
          <p className="text-xs text-gris">
            Solo cambian los que tienen número de seguimiento. Los demás siguen aquí.
          </p>
        </div>
      )}
    </form>
  );
}

/** Minúsculas y sin tildes: «García» y «garcia» son lo mismo al buscar */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
