"use client";

import { Dialogo } from "@/components/ui/Dialogo";
import { enLinea, textoConexion } from "@/config/equipo";
import type { Grupo } from "@/config/mensajes";
import type { MiembroGrupo } from "@/lib/mensajes/mensajes";
import { Avatar } from "./PantallaMensajes";

/**
 * «INFO DEL GRUPO» (como en WhatsApp): quién está dentro del General, Hardware o Edición, con su
 * puesto y su última conexión. La lista sale del rol de cada persona (no se apunta a mano).
 */
export function InfoGrupo({
  abierto,
  alCerrar,
  titulo,
  grupo,
  miembros,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  grupo: Grupo;
  miembros: MiembroGrupo[];
}) {
  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo="Info del grupo" className="max-w-md">
      <div className="flex flex-col items-center gap-2 border-b border-linea px-6 pt-4 pb-5 text-center">
        <span className="scale-125">
          <Avatar nombre={titulo} grupo={grupo.canal} />
        </span>
        <p className="mt-2 text-lg font-medium">{titulo}</p>
        <p className="text-sm text-gris">{grupo.descripcion}</p>
      </div>
      <p className="px-6 pt-4 text-xs font-semibold tracking-wide text-gris uppercase">
        {miembros.length} {miembros.length === 1 ? "persona" : "personas"}
      </p>
      <ul className="px-3 pt-1 pb-4">
        {miembros.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-md px-3 py-2">
            <Avatar
              nombre={m.nombre}
              foto={m.foto}
              conectado={!m.yo && enLinea(m.ultimaConexionEn)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {m.nombre}
                {m.yo && <span className="font-normal text-gris"> (tú)</span>}
              </span>
              <span className="block truncate text-xs text-gris">
                {m.puesto}
                {!m.yo && ` · ${textoConexion(m.ultimaConexionEn)}`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Dialogo>
  );
}
