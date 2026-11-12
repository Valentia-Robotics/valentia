"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import type { EnlaceNavegacion } from "@/config/marca";

interface Props {
  enlaces: EnlaceNavegacion[];
  /** Si existe, se usa en lugar de "enlaces" cuando hay sesión (y se añade "Cerrar sesión") */
  enlacesConSesion?: EnlaceNavegacion[];
}

const estilo = "text-gris transition-colors duration-100 hover:text-acento";

/** Lista de enlaces de una columna del pie. Cambia según hayas iniciado sesión o no. */
export function EnlacesPie({ enlaces, enlacesConSesion }: Props) {
  const { status } = useSession();
  const conSesion = enlacesConSesion !== undefined && status === "authenticated";
  const lista = conSesion ? enlacesConSesion : enlaces;

  return (
    <ul className="mt-4 space-y-3">
      {lista.map((enlace) => (
        <li key={enlace.href}>
          <Link href={enlace.href} className={estilo}>
            {enlace.etiqueta}
          </Link>
        </li>
      ))}
      {conSesion && (
        <li>
          <button type="button" onClick={() => signOut({ redirectTo: "/" })} className={estilo}>
            Cerrar sesión
          </button>
        </li>
      )}
    </ul>
  );
}
