import type { Metadata } from "next";
import Link from "next/link";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { Tabla } from "@/components/admin/Tabla";
import {
  enLinea,
  nombreRol,
  textoConexion,
  tieneAccesoAdmin,
  tieneEspacioHardware,
} from "@/config/equipo";
import { CUOTA_BYTES_PERSONA, tamanoLegible } from "@/config/hardware";
import { personasHardware } from "@/lib/hardware/archivos";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Hardware" };

/** HARDWARE: el equipo de hardware y sus espacios de archivos */
export default async function HardwareAdmin() {
  await exigirAdmin("/admin/hardware");
  const personas = await personasHardware();
  const ahora = new Date();

  return (
    <>
      <Cabecera
        titulo="Hardware"
        descripcion={`${plural(personas.length, "persona", "personas")}. Cada una tiene su espacio de archivos: solo lo ven ella y la administración. El rol (o «también hardware» a un administrador) se da desde Usuarios.`}
      />
      <Caja sinRelleno>
        <Tabla
          columnas={["Persona", "Archivos", "Espacio usado", "Última conexión"]}
          vacia={
            personas.length === 0 && (
              <>
                Nadie todavía. Busca a la persona en{" "}
                <Link href="/admin/usuarios" className="underline underline-offset-4">
                  Usuarios
                </Link>{" "}
                y pulsa «Hacer hardware».
              </>
            )
          }
        >
          {personas.map((p) => (
            <tr key={p.id}>
              <td>
                <Link
                  href={`/admin/hardware/${p.id}`}
                  className="font-medium hover:text-acento hover:underline"
                >
                  {p.nombre}
                </Link>{" "}
                {tieneAccesoAdmin(p.rol) && p.tambienHardware && (
                  <Insignia tono="aviso">{nombreRol(p.rol, p.rolFemenino)}</Insignia>
                )}{" "}
                {!tieneEspacioHardware(p) && <Insignia>Ya no es de hardware</Insignia>}
                <p className="text-xs text-gris">{p.email}</p>
              </td>
              <td className="tabular-nums">{p.archivos}</td>
              <td className="whitespace-nowrap text-gris tabular-nums">
                {tamanoLegible(p.usados)} de {tamanoLegible(CUOTA_BYTES_PERSONA)}
              </td>
              <td className="whitespace-nowrap">
                {enLinea(p.ultima, ahora) ? (
                  <Insignia tono="exito">● Conectado ahora</Insignia>
                ) : (
                  textoConexion(p.ultima, ahora)
                )}
              </td>
            </tr>
          ))}
        </Tabla>
      </Caja>
    </>
  );
}
