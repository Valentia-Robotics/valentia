"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  ChartColumn,
  Clapperboard,
  Clock,
  Cpu,
  FolderOpen,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Newspaper,
  PackageSearch,
  QrCode,
  ShoppingBag,
  Star,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/marca/Logo";
import { AvisosEquipo } from "@/components/mensajes/AvisosEquipo";
import { ContadorMensajes } from "@/components/mensajes/ContadorMensajes";
import { cn } from "@/lib/utils";

/** Los mensajes del equipo (/mensajes): salen en las tres zonas, con el número de no leídos */
const MENSAJES = { href: "/mensajes", etiqueta: "Mensajes", icono: MessageCircle };

/** El stock (/stock): lo ve todo el equipo; solo administración lo cambia */
const STOCK = { href: "/stock", etiqueta: "Stock", icono: PackageSearch };

/** Secciones del panel. Para añadir una nueva, añádela aquí. */
const seccionesAdmin: { href: string; etiqueta: string; icono: LucideIcon }[] = [
  { href: "/admin", etiqueta: "Inicio", icono: LayoutDashboard },
  MENSAJES,
  { href: "/admin/visitas", etiqueta: "Visitas", icono: ChartColumn },
  { href: "/admin/pedidos", etiqueta: "Pedidos", icono: ShoppingBag },
  { href: "/admin/finanzas", etiqueta: "Finanzas", icono: Wallet },
  { href: "/admin/componentes", etiqueta: "Componentes", icono: Cpu },
  { href: "/admin/kits", etiqueta: "Kits", icono: Boxes },
  STOCK,
  { href: "/admin/cursos", etiqueta: "Cursos", icono: BookOpen },
  { href: "/admin/codigos", etiqueta: "Códigos", icono: QrCode },
  { href: "/admin/contenido", etiqueta: "Contenido", icono: Clapperboard },
  { href: "/admin/blog", etiqueta: "Blog", icono: Newspaper },
  { href: "/admin/hardware", etiqueta: "Hardware", icono: FolderOpen },
  { href: "/admin/resenas", etiqueta: "Reseñas", icono: Star },
  { href: "/admin/lista-espera", etiqueta: "Lista de espera", icono: Mail },
  { href: "/admin/usuarios", etiqueta: "Usuarios", icono: Users },
  { href: "/admin/empleados", etiqueta: "Empleados", icono: Clock },
];

/** El panel de editor usa este mismo menú, pero solo con lo suyo */
const seccionesEditor: typeof seccionesAdmin = [
  { href: "/editor", etiqueta: "Mis guiones", icono: Clapperboard },
  { href: "/editor/blog", etiqueta: "Mis artículos", icono: Newspaper },
  MENSAJES,
  STOCK,
];

/** La zona de hardware: su espacio de archivos */
const seccionesHardware: typeof seccionesAdmin = [
  { href: "/hardware", etiqueta: "Mi espacio", icono: FolderOpen },
  MENSAJES,
  STOCK,
];

/**
 * Menú del panel de administración.
 * En ordenador es una columna fija a la izquierda; en el móvil, una barra arriba
 * con las secciones en una fila que se puede deslizar.
 */
export function MenuAdmin({
  nombre,
  email,
  zona = "admin",
}: {
  nombre: string;
  email: string;
  zona?: "admin" | "editor" | "hardware";
}) {
  const ruta = usePathname();
  const secciones =
    zona === "editor" ? seccionesEditor : zona === "hardware" ? seccionesHardware : seccionesAdmin;
  const inicio = secciones[0].href;
  // La primera sección no se marca en las demás (/admin/kits no es «Inicio»; /editor/blog no es
  // «Mis guiones»), salvo las fichas de guion del editor (/editor/<id>)
  const activa = (href: string) =>
    href === inicio
      ? ruta === inicio || (zona === "editor" && /^\/editor\/[0-9a-f]{24}$/.test(ruta))
      : ruta === href || ruta.startsWith(`${href}/`);

  return (
    <aside className="border-b border-linea bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 print:hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 lg:block lg:px-5 lg:pt-6">
        <Link href={inicio} className="inline-flex items-center gap-2">
          <Logo alto={14} />
          <span className="rounded bg-tinta px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">
            {zona === "editor" ? "Editor" : zona === "hardware" ? "Hardware" : "Panel"}
          </span>
        </Link>
        {/* En el móvil, la tienda y cerrar sesión van arriba a la derecha */}
        <div className="flex items-center gap-3 text-sm text-gris lg:hidden">
          <Link href="/" className="hover:text-tinta">
            Ver tienda
          </Link>
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/" })}
            aria-label="Cerrar sesión"
            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-niebla hover:text-tinta"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <nav aria-label="Secciones del panel" className="mt-3 lg:mt-8 lg:flex-1">
        <ul className="sin-barra flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
          {secciones.map(({ href, etiqueta, icono: Icono }) => (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={activa(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  activa(href)
                    ? "bg-tinta text-white"
                    : "text-tinta/80 hover:bg-niebla hover:text-tinta",
                )}
              >
                <Icono aria-hidden="true" className="size-4" strokeWidth={1.8} />
                {etiqueta}
                {href === MENSAJES.href && <ContadorMensajes activo={activa(href)} />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="hidden border-t border-linea p-4 text-sm lg:block">
        <p className="truncate font-medium">{nombre}</p>
        <p className="truncate text-xs text-gris">{email}</p>
        <div className="mt-3 flex flex-col gap-1">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-gris hover:bg-niebla hover:text-tinta"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Ver la tienda
          </Link>
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/" })}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-gris hover:bg-niebla hover:text-tinta"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
      {/* Mensajes sin leer y alarmas de tareas (todo el equipo usa este menú) */}
      <AvisosEquipo />
    </aside>
  );
}
