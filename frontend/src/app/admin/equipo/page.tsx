import type { Metadata } from "next";
import Link from "next/link";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import { enLinea, textoConexion } from "@/config/equipo";
import { fechaHora } from "@/lib/admin/formato";
import { obtenerEquipo } from "@/lib/admin/equipo";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Equipo" };

/** EQUIPO: quién trabaja en la web y cuándo se conectó por última vez */
export default async function EquipoAdmin() {
  await exigirAdmin("/admin/equipo");
  const grupos = await obtenerEquipo();
  const ahora = new Date();
  const total = grupos.reduce((n, g) => n + g.personas.length, 0);

  return (
    <>
      <Cabecera
        titulo="Equipo"
        descripcion={`${plural(total, "persona", "personas")} con un rol de trabajo. La conexión se apunta mientras usan la web con la sesión abierta (con unos minutos de margen).`}
      />
      <div className="space-y-6">
        {grupos.map((g) => (
          <Caja key={g.rol} titulo={g.plural} sinRelleno>
            <Tabla
              columnas={["Persona", "Última conexión"]}
              vacia={
                g.personas.length === 0 && (
                  <>
                    Nadie todavía. Se da el rol desde{" "}
                    <Link href="/admin/usuarios" className="underline underline-offset-4">
                      Usuarios
                    </Link>
                    .
                  </>
                )
              }
            >
              {g.personas.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-gris">{p.email}</p>
                  </td>
                  <td className="whitespace-nowrap">
                    {enLinea(p.ultima, ahora) ? (
                      <Insignia tono="exito">● Conectado ahora</Insignia>
                    ) : (
                      <span title={p.ultima ? fechaHora(p.ultima) : undefined}>
                        {textoConexion(p.ultima, ahora)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </Tabla>
          </Caja>
        ))}
      </div>
    </>
  );
}
