"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Clapperboard, LayoutDashboard, LogOut, QrCode, UserRound } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { enSeccion } from "@/config/marca";
import { cn } from "@/lib/utils";

/**
 * En ordenador: botón "Iniciar sesión" o, si ya has entrado, un círculo con tu inicial
 * que abre un menú (Mis cursos, Activar un kit, Mi cuenta, Cerrar sesión).
 */
export function MenuUsuario() {
  const { data: sesion, status } = useSession();
  const ruta = usePathname();
  const enCuenta = enSeccion(ruta, { href: "/cuenta" });
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Cerrar el menú al pulsar fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", alPulsar);
    document.addEventListener("keydown", alTecla);
    return () => {
      document.removeEventListener("mousedown", alPulsar);
      document.removeEventListener("keydown", alTecla);
    };
  }, [abierto]);

  // Mientras se comprueba la sesión, guardamos el hueco para que nada "salte"
  if (status === "loading") return <span className="ml-2 hidden h-8 w-28 md:inline-block" />;

  if (!sesion?.user) {
    return (
      <Link
        href="/login"
        className="ml-2 hidden h-8 items-center rounded-boton bg-tinta px-4 text-[13px] font-medium text-white transition-colors hover:bg-grafito md:inline-flex"
      >
        Iniciar sesión
      </Link>
    );
  }

  const nombre = sesion.user.name ?? "Tu cuenta";
  const cerrar = () => setAbierto(false);

  return (
    <div ref={contenedor} className="relative ml-2 hidden md:block">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-controls="menu-usuario"
        aria-label={`Menú de ${nombre}`}
        className={cn(
          "flex size-8 items-center justify-center rounded-full bg-tinta font-titulo text-sm text-white transition-colors hover:bg-grafito",
          // En "Mi cuenta" el círculo lleva un anillo azul: es la sección actual
          enCuenta && "ring-2 ring-acento ring-offset-2",
        )}
      >
        {nombre.charAt(0).toUpperCase()}
      </button>

      <div
        id="menu-usuario"
        inert={!abierto}
        className={cn(
          "absolute top-11 right-0 w-60 origin-top-right rounded-control bg-white p-2 shadow-flotante ring-1 ring-linea transition-[opacity,scale,translate,visibility] duration-180",
          !abierto && "invisible -translate-y-1 scale-95 opacity-0",
        )}
      >
        <p className="px-3 pt-2 pb-3 text-sm">
          <span className="block font-medium">{nombre}</span>
          <span className="block truncate text-xs text-gris">{sesion.user.email}</span>
        </p>
        <ul className="border-t border-linea pt-1 text-sm">
          <ElementoMenu href="/cursos" icono={BookOpen} alPulsar={cerrar}>
            Mis cursos
          </ElementoMenu>
          <ElementoMenu href="/activar" icono={QrCode} alPulsar={cerrar}>
            Activar un kit
          </ElementoMenu>
          <ElementoMenu href="/cuenta" icono={UserRound} alPulsar={cerrar}>
            Mi cuenta
          </ElementoMenu>
          {sesion.user.rol === "ADMIN" && (
            <ElementoMenu href="/admin" icono={LayoutDashboard} alPulsar={cerrar}>
              Panel de administración
            </ElementoMenu>
          )}
          {sesion.user.rol === "EDITOR" && (
            <ElementoMenu href="/editor" icono={Clapperboard} alPulsar={cerrar}>
              Panel de editor
            </ElementoMenu>
          )}
          <li>
            <button
              type="button"
              onClick={() => signOut({ redirectTo: "/" })}
              className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left hover:bg-niebla"
            >
              <LogOut aria-hidden="true" className="size-4 text-gris" />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ElementoMenu({
  href,
  icono: Icono,
  alPulsar,
  children,
}: {
  href: string;
  icono: typeof BookOpen;
  alPulsar: () => void;
  children: string;
}) {
  const activo = enSeccion(usePathname(), { href });
  return (
    <li>
      <Link
        href={href}
        onClick={alPulsar}
        aria-current={activo ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-control px-3 py-2 hover:bg-niebla",
          activo && "bg-acento/8 font-medium text-acento",
        )}
      >
        <Icono aria-hidden="true" className="size-4 text-gris" />
        {children}
      </Link>
    </li>
  );
}
