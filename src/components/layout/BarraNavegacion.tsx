"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Logo } from "@/components/marca/Logo";
import { enlacesNavegacion, marca } from "@/config/marca";
import { cn } from "@/lib/utils";
import { BotonCarrito } from "./BotonCarrito";
import { MenuUsuario } from "./MenuUsuario";

/**
 * Barra de navegación fija, fina y translúcida (con desenfoque del fondo).
 * En móvil, los enlaces se esconden en un menú desplegable.
 */
export function BarraNavegacion() {
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { data: sesion } = useSession();

  const estaActivo = (href: string) => ruta === href || ruta.startsWith(`${href}/`);

  // Cerrar el menú móvil con la tecla Escape
  useEffect(() => {
    if (!menuAbierto) return;
    const alPulsarTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    window.addEventListener("keydown", alPulsarTecla);
    return () => window.removeEventListener("keydown", alPulsarTecla);
  }, [menuAbierto]);

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 print:hidden">
      <nav
        aria-label="Navegación principal"
        className={cn(
          "border-b border-linea/60 backdrop-blur-xl backdrop-saturate-150 transition-colors",
          menuAbierto ? "bg-white" : "bg-white/75",
        )}
      >
        <div className="mx-auto flex h-nav max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            onClick={cerrarMenu}
            aria-label={`${marca.nombre}, ir al inicio`}
            className="shrink-0 py-2"
          >
            <Logo alto={16} prioridad />
          </Link>

          {/* Enlaces en ordenador */}
          <ul className="hidden items-center gap-8 md:flex">
            {enlacesNavegacion.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  aria-current={estaActivo(enlace.href) ? "page" : undefined}
                  className={cn(
                    "text-[13px] transition-colors",
                    estaActivo(enlace.href) ? "text-tinta" : "text-tinta/70 hover:text-tinta",
                  )}
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <BotonCarrito />
            <MenuUsuario />

            {/* Botón del menú en móvil */}
            <button
              type="button"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              className="inline-flex size-10 items-center justify-center rounded-full text-tinta/80 hover:bg-tinta/5 md:hidden"
            >
              {menuAbierto ? (
                <X aria-hidden="true" className="size-5" strokeWidth={1.6} />
              ) : (
                <Menu aria-hidden="true" className="size-5" strokeWidth={1.6} />
              )}
            </button>
          </div>
        </div>

        {/* Menú desplegable en móvil */}
        <div id="menu-movil" hidden={!menuAbierto} className="border-t border-linea/60 md:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-4 sm:px-6">
            {enlacesNavegacion.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  onClick={cerrarMenu}
                  aria-current={estaActivo(enlace.href) ? "page" : undefined}
                  className="block py-3 font-titulo text-2xl text-tinta"
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
            <li className="mt-4 border-t border-linea pt-4">
              {sesion?.user ? (
                <>
                  <p className="py-2 text-sm text-gris">Hola, {sesion.user.name}</p>
                  <Link
                    href="/activar"
                    onClick={cerrarMenu}
                    className="block py-3 text-lg text-tinta"
                  >
                    Activar un kit
                  </Link>
                  {sesion.user.rol === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={cerrarMenu}
                      className="block py-3 text-lg text-tinta"
                    >
                      Panel de administración
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="block py-3 text-lg text-acento"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={cerrarMenu} className="block py-3 text-lg text-acento">
                  Iniciar sesión
                </Link>
              )}
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
