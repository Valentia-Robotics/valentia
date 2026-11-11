import { tieneAccesoAdmin } from "@/config/equipo";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MenuAdmin } from "@/components/admin/MenuAdmin";
import { TransicionPagina } from "@/components/layout/TransicionPagina";
import { exigirEditor } from "@/lib/sesion";

export const metadata: Metadata = {
  title: { default: "Editor", template: "%s · Editor · Valentia" },
  robots: { index: false, follow: false },
};

/**
 * PANEL DE EDITOR (todo lo que hay bajo /editor)
 * Mismo aspecto que el panel de administración, pero reducido a sus guiones.
 * Este layout ya comprueba que trabajas como editor (rol EDITOR o admin que también edita; el admin
 * ve su menú de siempre con «Mis guiones»), pero cada página y cada acción
 * lo vuelve a comprobar por su cuenta (nunca nos fiamos de un solo control).
 */
export default async function LayoutEditor({ children }: { children: ReactNode }) {
  const editor = await exigirEditor();

  return (
    <div className="flex flex-1 flex-col bg-niebla lg:flex-row">
      <MenuAdmin
        nombre={editor.nombre}
        email={editor.email}
        zona={tieneAccesoAdmin(editor.rol) ? "admin" : "editor"}
        tambienEditor={!!editor.tambienEditor}
        femenino={!!editor.rolFemenino}
      />
      <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <TransicionPagina>{children}</TransicionPagina>
        </div>
      </main>
    </div>
  );
}
