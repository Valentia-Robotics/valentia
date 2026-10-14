import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MenuAdmin } from "@/components/admin/MenuAdmin";
import { exigirAdmin } from "@/lib/sesion";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel · Valentia" },
  robots: { index: false, follow: false },
};

/**
 * PANEL DE ADMINISTRACIÓN (todo lo que hay bajo /admin)
 * Diseño propio, más sobrio que el de la tienda: es una herramienta de trabajo.
 * Este layout ya comprueba que eres ADMIN, pero cada página y cada acción
 * lo vuelve a comprobar por su cuenta (nunca nos fiamos de un solo control).
 */
export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  const admin = await exigirAdmin();

  return (
    <div className="flex flex-1 flex-col bg-niebla lg:flex-row">
      <MenuAdmin nombre={admin.nombre} email={admin.email} />
      <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10 print:p-0">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
