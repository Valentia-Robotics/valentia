import type { Metadata } from "next";
import { QrCode } from "lucide-react";
import { FormularioCodigo } from "@/components/cursos/FormularioCodigo";
import { TarjetaCurso } from "@/components/cursos/TarjetaCurso";
import { Boton } from "@/components/ui/Boton";
import { Contenedor } from "@/components/ui/Contenedor";
import { obtenerCursosDeUsuario } from "@/lib/cursos";
import { CabeceraPagina } from "@/components/ui/CabeceraPagina";
import { exigirUsuario } from "@/lib/sesion";
import { PreferenciaNovedades } from "@/components/cuenta/PreferenciaNovedades";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Mis cursos", robots: { index: false } };

/** MIS CURSOS: los cursos desbloqueados por el usuario con su progreso */
export default async function PaginaMisCursos() {
  const usuario = await exigirUsuario("/cursos");
  const [cursos, perfil] = await Promise.all([
    obtenerCursosDeUsuario(usuario.id),
    db.usuario.findUnique({ where: { id: usuario.id }, select: { novedades: true } }),
  ]);
  // Quien aún no ha dicho si quiere correos de novedades (cuentas de antes de la casilla del registro)
  const preguntar = perfil?.novedades == null;

  return (
    <>
      <CabeceraPagina
        compacta
        etiqueta={`Hola, ${usuario.nombre.split(" ")[0]}`}
        titulo="Mis cursos."
      />
      <Contenedor className="py-12 sm:py-16">
        {preguntar && (
          <div className="max-w-2xl">
            <PreferenciaNovedades quiere={null} pregunta />
          </div>
        )}
        {cursos.length === 0 ? (
          <section className="mt-10 max-w-2xl rounded-tarjeta bg-niebla p-8 sm:p-10">
            <QrCode aria-hidden="true" className="size-10 text-acento" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-medium">Todavía no tienes cursos</h2>
            <p className="mt-2 text-gris">
              Cada kit de Valentia trae en la caja una tarjeta con un código QR. Escanéalo con el
              móvil o escribe aquí el código para desbloquear tu curso.
            </p>
            <div className="mt-6">
              <FormularioCodigo />
            </div>
            <p className="mt-6 text-sm text-gris">
              ¿Aún no tienes un kit?{" "}
              <Boton href="/kits" variante="enlace" className="h-auto text-sm underline">
                Ver los kits ›
              </Boton>
            </p>
          </section>
        ) : (
          <>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cursos.map((curso) => (
                <TarjetaCurso key={curso.slug} curso={curso} />
              ))}
            </div>
            <p className="mt-10 text-sm text-gris">
              ¿Tienes otro kit?{" "}
              <Boton href="/activar" variante="enlace" className="h-auto text-sm underline">
                Activar un código ›
              </Boton>
            </p>
          </>
        )}
      </Contenedor>
    </>
  );
}
