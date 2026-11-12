import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Mail, MapPin, Package, ShieldCheck, UserRound } from "lucide-react";
import { FormularioContrasena } from "@/components/cuenta/FormularioContrasena";
import { FormularioFoto } from "@/components/cuenta/FormularioFoto";
import { FormularioNombre } from "@/components/cuenta/FormularioNombre";
import { ListaPedidos } from "@/components/cuenta/ListaPedidos";
import { PreferenciaNovedades } from "@/components/cuenta/PreferenciaNovedades";
import { MisDirecciones } from "@/components/cuenta/MisDirecciones";
import { MisDispositivos, type DispositivoVista } from "@/components/cuenta/MisDispositivos";
import { Contenedor } from "@/components/ui/Contenedor";
import { db } from "@/lib/db";
import { pedidosDeUsuario } from "@/lib/pedidos";
import { exigirUsuario } from "@/lib/sesion";
import { formatearTelefono } from "@/lib/validaciones/pedido";
import { haceCuanto } from "@/lib/utils";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { idDeEsteNavegador, listarDispositivos } from "@/lib/verificacion/dispositivos";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

/** MI CUENTA: pedidos, direcciones guardadas, dispositivos de confianza, nombre y contraseña */
export default async function PaginaMiCuenta() {
  const usuario = await exigirUsuario("/cuenta");
  const [dispositivos, esteId, pedidos, direcciones, perfil] = await Promise.all([
    listarDispositivos(usuario.id),
    idDeEsteNavegador(),
    pedidosDeUsuario(usuario),
    db.direccion.findMany({
      where: { usuarioId: usuario.id },
      orderBy: [{ predeterminada: "desc" }, { creadoEn: "desc" }],
    }),
    db.usuario.findUnique({ where: { id: usuario.id }, select: { foto: true, novedades: true } }),
  ]);

  // Preparamos los textos aquí (en el servidor) para que no cambien al cargar la página
  const vista: DispositivoVista[] = dispositivos
    .map((d) => ({
      id: d.id,
      nombre: d.nombre,
      ultimoUso: haceCuanto(d.ultimoUsoEn),
      desde: formatoFecha.format(d.creadoEn),
      hasta: formatoFecha.format(d.caducaEn),
      esEste: d.id === esteId,
    }))
    // Este dispositivo, siempre el primero
    .sort((a, b) => Number(b.esEste) - Number(a.esEste));

  return (
    <>
      <CabeceraPagina
        compacta
        etiqueta={`Hola, ${usuario.nombre.split(" ")[0]}`}
        titulo="Mi cuenta."
        entradilla={
          <p>
            Has entrado como <strong className="font-medium wrap-anywhere">{usuario.email}</strong>.
          </p>
        }
      />
      <Contenedor className="py-12 sm:py-16">
        <section aria-labelledby="titulo-pedidos" className="mt-12 max-w-2xl">
          <div className="flex items-end justify-between gap-4">
            <h2 id="titulo-pedidos" className="flex items-center gap-2 text-2xl font-medium">
              <Package aria-hidden="true" className="size-6 text-acento" />
              Mis pedidos
            </h2>
            {pedidos.length > 0 && (
              <Link href="/cuenta/pedidos" className="text-sm text-acento hover:underline">
                Ver todos ›
              </Link>
            )}
          </div>
          <div className="mt-6">
            <ListaPedidos pedidos={pedidos.slice(0, 3)} />
          </div>
        </section>

        <section aria-labelledby="titulo-direcciones" className="mt-14 max-w-2xl">
          <h2 id="titulo-direcciones" className="flex items-center gap-2 text-2xl font-medium">
            <MapPin aria-hidden="true" className="size-6 text-acento" />
            Mis direcciones
          </h2>
          <p className="mt-2 mb-6 text-gris">
            Así no tienes que escribirlas otra vez en tu próximo pedido.
          </p>
          <MisDirecciones
            direcciones={direcciones.map((d) => ({
              id: d.id,
              nombre: d.nombre,
              lineas: `${d.direccion}, ${d.codigoPostal} ${d.ciudad} (${d.provincia}) · ${formatearTelefono(d.telefono)}`,
            }))}
          />
        </section>

        <section aria-labelledby="titulo-dispositivos" className="mt-14 max-w-2xl">
          <h2 id="titulo-dispositivos" className="flex items-center gap-2 text-2xl font-medium">
            <ShieldCheck aria-hidden="true" className="size-6 text-acento" />
            Mis dispositivos
          </h2>
          <p className="mt-2 mb-6 text-gris">
            En estos dispositivos ya confirmaste con un código que eras tú, así que no te lo
            volvemos a pedir hasta la fecha indicada. ¿No reconoces alguno? Elimínalo y cambia tu
            contraseña.
          </p>
          <MisDispositivos dispositivos={vista} />
        </section>

        <section aria-labelledby="titulo-nombre" className="mt-14 max-w-2xl">
          <h2 id="titulo-nombre" className="flex items-center gap-2 text-2xl font-medium">
            <UserRound aria-hidden="true" className="size-6 text-acento" />
            Tu perfil
          </h2>
          <p className="mt-2 mb-6 text-gris">
            Tu foto y tu nombre salen en el menú, y tu nombre en los correos que te mandamos.
          </p>
          <FormularioFoto foto={perfil?.foto ?? null} nombre={usuario.nombre} />
          <div className="mt-8">
            <FormularioNombre nombre={usuario.nombre} />
          </div>
        </section>

        <section
          id="novedades"
          aria-labelledby="titulo-novedades"
          className="mt-14 max-w-2xl scroll-mt-24"
        >
          <h2 id="titulo-novedades" className="flex items-center gap-2 text-2xl font-medium">
            <Mail aria-hidden="true" className="size-6 text-acento" />
            Correos de novedades
          </h2>
          <p className="mt-2 mb-6 text-gris">
            Te escribimos cuando sacamos un kit nuevo o hay algo que merece la pena contar. Los
            correos de tus pedidos y de tu cuenta te llegan siempre, elijas lo que elijas.
          </p>
          <PreferenciaNovedades quiere={perfil?.novedades ?? null} />
        </section>

        <section aria-labelledby="titulo-contrasena" className="mt-14 max-w-2xl">
          <h2 id="titulo-contrasena" className="flex items-center gap-2 text-2xl font-medium">
            <KeyRound aria-hidden="true" className="size-6 text-acento" />
            Cambiar contraseña
          </h2>
          <p className="mt-2 mb-6 text-gris">
            Por seguridad, al cambiarla cerraremos la sesión en todos tus dispositivos menos en
            este.
          </p>
          <FormularioContrasena />
        </section>
      </Contenedor>
    </>
  );
}
