import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MenuAdmin } from "@/components/admin/MenuAdmin";
import { esDelEquipo } from "@/config/equipo";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = {
  title: { default: "Mensajes", template: "%s · Mensajes · Valentia" },
  robots: { index: false, follow: false },
  // Al añadirla a la pantalla de inicio desde aquí, el icono abre los mensajes (src/app/equipo.webmanifest)
  manifest: "/equipo.webmanifest",
  appleWebApp: { capable: true, title: "Valentia Equipo", statusBarStyle: "default" },
};

/**
 * MENSAJES DEL EQUIPO (todo lo que hay bajo /mensajes): el «WhatsApp» del equipo.
 * Lo usan administración, editores y hardware, cada uno con el menú de su zona.
 * A un cliente le da 404. Cada página y acción vuelve a comprobar quién eres.
 */
export default async function LayoutMensajes({ children }: { children: ReactNode }) {
  const yo = await exigirUsuario("/mensajes");
  if (!esDelEquipo(yo.rol)) notFound();
  const zona = yo.rol === "EDITOR" ? "editor" : yo.rol === "HARDWARE" ? "hardware" : "admin";

  return (
    <div className="flex h-dvh flex-col bg-niebla lg:flex-row">
      <MenuAdmin
        nombre={yo.nombre}
        email={yo.email}
        zona={zona}
        tambienEditor={!!yo.tambienEditor}
        tambienHardware={!!yo.tambienHardware}
        femenino={!!yo.rolFemenino}
      />
      <main id="contenido" className="flex min-h-0 min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
