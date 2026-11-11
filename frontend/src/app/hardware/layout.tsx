import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MenuAdmin } from "@/components/admin/MenuAdmin";
import { TransicionPagina } from "@/components/layout/TransicionPagina";
import { exigirHardware } from "@/lib/sesion";

export const metadata: Metadata = {
  title: { default: "Hardware", template: "%s · Hardware · Valentia" },
  robots: { index: false, follow: false },
};

/**
 * ZONA DE HARDWARE (todo lo que hay bajo /hardware): el espacio de archivos de cada persona del
 * equipo de hardware. Mismo aspecto que el panel. El layout comprueba el rol, pero cada página,
 * ruta y acción lo vuelve a comprobar por su cuenta.
 */
export default async function LayoutHardware({ children }: { children: ReactNode }) {
  const persona = await exigirHardware();

  return (
    <div className="flex flex-1 flex-col bg-niebla lg:flex-row">
      {/* Un admin con «también hardware» sigue viendo su menú del panel (con «Mi espacio») */}
      {persona.rol === "HARDWARE" ? (
        <MenuAdmin nombre={persona.nombre} email={persona.email} zona="hardware" />
      ) : (
        <MenuAdmin
          nombre={persona.nombre}
          email={persona.email}
          tambienEditor={!!persona.tambienEditor}
          tambienHardware
          femenino={!!persona.rolFemenino}
        />
      )}
      <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <TransicionPagina>{children}</TransicionPagina>
        </div>
      </main>
    </div>
  );
}
