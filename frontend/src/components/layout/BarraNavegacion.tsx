"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Logo } from "@/components/marca/Logo";
import { enlacesNavegacion, enSeccion, marca, type EnlaceNavegacion } from "@/config/marca";
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

  const estaActivo = (enlace: EnlaceNavegacion) => enSeccion(ruta, enlace);

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
    // El nombre la deja quieta mientras cambia la página (globals.css)
    <header
      className="fixed inset-x-0 top-0 z-50 print:hidden"
      style={{ viewTransitionName: "barra" }}
    >
      <nav
        aria-label="Navegación principal"
        className={cn(
          // En el móvil, desenfoque más corto (el navegador lo rehace en cada paso del scroll) y
          // fondo algo más opaco para que se vea igual
          "border-b border-linea/60 backdrop-blur-md backdrop-saturate-150 transition-colors lg:backdrop-blur-xl",
          menuAbierto ? "bg-white" : "bg-white/85 lg:bg-white/75",
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

          {/* Enlaces en ordenador: el de la sección actual va en negrita con una raya azul debajo */}
          <ul className="hidden h-full items-stretch gap-4 md:flex lg:gap-8">
            {enlacesNavegacion.map((enlace) => (
              <li key={enlace.href} className="flex">
                <Link
                  href={enlace.href}
                  aria-current={estaActivo(enlace) ? "page" : undefined}
                  className={cn(
                    "relative flex items-center text-[13px] transition-colors",
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-acento after:transition-transform",
                    estaActivo(enlace)
                      ? "font-medium text-tinta after:scale-x-100"
                      : "text-tinta/70 after:scale-x-0 hover:text-tinta",
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

        {/* Menú desplegable en móvil: se abre deslizando (de 0 a su alto real); cerrado, «inert» lo
            saca del teclado y de los lectores de pantalla */}
        <div
          id="menu-movil"
          inert={!menuAbierto}
          className={cn(
            "grid transition-[grid-template-rows] duration-300 md:hidden",
            menuAbierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <ul
            className={cn(
              "mx-auto flex min-h-0 w-full max-w-6xl flex-col overflow-hidden px-4 transition-opacity duration-300 sm:px-6",
              menuAbierto ? "max-h-[calc(100dvh-var(--spacing-nav))] overflow-y-auto" : "opacity-0",
            )}
          >
            {enlacesNavegacion.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  onClick={cerrarMenu}
                  aria-current={estaActivo(enlace) ? "page" : undefined}
                  className={cn(
                    "-mx-3 flex items-center justify-between rounded-control px-3 py-3 font-titulo text-2xl",
                    estaActivo(enlace) ? "bg-acento/8 text-acento" : "text-tinta",
                  )}
                >
                  {enlace.etiqueta}
                  {estaActivo(enlace) && (
                    <span
                      aria-hidden="true"
                      className="font-sans text-xs font-medium tracking-wide uppercase"
                    >
                      Estás aquí
                    </span>
                  )}
                </Link>
              </li>
            ))}
            <li className="mt-4 mb-4 border-t border-linea pt-4">
              {sesion?.user ? (
                <>
                  <p className="py-2 text-sm text-gris">Hola, {sesion.user.name}</p>
                  {[
                    { href: "/activar", etiqueta: "Activar un kit" },
                    { href: "/cuenta", etiqueta: "Mi cuenta" },
                    ...(sesion.user.rol === "ADMIN"
                      ? [{ href: "/admin", etiqueta: "Panel de administración" }]
                      : []),
                    ...(sesion.user.rol === "EDITOR"
                      ? [{ href: "/editor", etiqueta: "Panel de editor" }]
                      : []),
                    ...(sesion.user.rol === "HARDWARE"
                      ? [{ href: "/hardware", etiqueta: "Mi espacio de hardware" }]
                      : []),
                  ].map((enlace) => (
                    <Link
                      key={enlace.href}
                      href={enlace.href}
                      onClick={cerrarMenu}
                      aria-current={estaActivo(enlace) ? "page" : undefined}
                      className={cn(
                        "block py-3 text-lg",
                        estaActivo(enlace) ? "font-medium text-acento" : "text-tinta",
                      )}
                    >
                      {enlace.etiqueta}
                    </Link>
                  ))}
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
