import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MenuAdmin } from "@/components/admin/MenuAdmin";
import { TransicionPagina } from "@/components/layout/TransicionPagina";
import { esDelEquipo } from "@/config/equipo";
import { exigirUsuario } from "@/lib/sesion";

export const metadata: Metadata = {
  title: { default: "Stock", template: "%s · Stock · Valentia" },
  robots: { index: false, follow: false },
};

/**
 * STOCK (todo lo que hay bajo /stock): lo ve todo el equipo, cada uno con el menú de su zona.
 * Cambiarlo solo puede un ADMIN (la página esconde los botones y la acción lo vuelve a comprobar).
 * A un cliente le da 404.
 */
export default async function LayoutStock({ children }: { children: ReactNode }) {
  const yo = await exigirUsuario("/stock");
  if (!esDelEquipo(yo.rol)) notFound();
  const zona = yo.rol === "EDITOR" ? "editor" : yo.rol === "HARDWARE" ? "hardware" : "admin";

  return (
    <div className="flex flex-1 flex-col bg-niebla lg:flex-row">
      <MenuAdmin
        nombre={yo.nombre}
        email={yo.email}
        zona={zona}
        tambienEditor={!!yo.tambienEditor}
        femenino={!!yo.rolFemenino}
      />
      <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <TransicionPagina>{children}</TransicionPagina>
        </div>
      </main>
    </div>
  );
}
