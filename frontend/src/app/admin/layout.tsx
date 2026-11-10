import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MenuAdmin } from "@/components/admin/MenuAdmin";
import { TransicionPagina } from "@/components/layout/TransicionPagina";
import { exigirPanel } from "@/lib/sesion";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel · Valentia" },
  robots: { index: false, follow: false },
};

/**
 * PANEL DE ADMINISTRACIÓN (todo lo que hay bajo /admin)
 * Diseño propio, más sobrio que el de la tienda: es una herramienta de trabajo.
 * Este layout deja pasar a ADMIN y a HARDWARE, pero cada página y cada acción comprueba lo suyo
 * (nunca nos fiamos de un solo control): casi todo es solo ADMIN (exigirAdmin); componentes y kits,
 * también HARDWARE (exigirCatalogo). Hardware ve el menú de su zona, con esas dos secciones.
 */
export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  const persona = await exigirPanel();

  return (
    <div className="flex flex-1 flex-col bg-niebla lg:flex-row print:bg-white">
      <MenuAdmin
        nombre={persona.nombre}
        email={persona.email}
        zona={persona.rol === "HARDWARE" ? "hardware" : "admin"}
      />
      <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10 print:p-0">
        <div className="mx-auto max-w-6xl">
          <TransicionPagina>{children}</TransicionPagina>
        </div>
      </main>
    </div>
  );
}
