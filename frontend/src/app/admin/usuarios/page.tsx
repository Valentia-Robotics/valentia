import { Fragment } from "react";
import type { Metadata } from "next";
import { BotonAdmin } from "@/components/admin/BotonAdmin";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Buscador } from "@/components/admin/Buscador";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { leerPagina, Paginacion } from "@/components/admin/Paginacion";
import { Tabla } from "@/components/admin/Tabla";
import { esDelEquipo, textoConexion } from "@/config/equipo";
import { fecha } from "@/lib/admin/formato";
import { buscarUsuarios } from "@/lib/admin/usuarios";
import { exigirAdmin } from "@/lib/sesion";
import type { Rol } from "@/generated/prisma/enums";
import { cambiarRolTrabajo } from "./acciones";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Usuarios" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** USUARIOS: lista con buscador por email o nombre */
export default async function UsuariosAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/usuarios");
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q : "";
  const pagina = leerPagina(parametros.pagina);
  const { usuarios, total, totalEmpleados, totalPaginas } = await buscarUsuarios(q, pagina);
  const ahora = new Date();

  return (
    <>
      <Cabecera
        titulo="Usuarios"
        descripcion={
          q
            ? `${plural(total, "cuenta encontrada", "cuentas encontradas")} para «${q}»`
            : plural(total, "cuenta registrada", "cuentas registradas")
        }
        acciones={
          <BotonAdmin href="/admin/empleados" variante="secundario">
            Empleados y última conexión
          </BotonAdmin>
        }
      />
      <div className="mb-4">
        <Buscador valor={q} placeholder="Buscar por email o nombre" etiqueta="Buscar usuarios" />
      </div>

      <Caja sinRelleno>
        <Tabla
          columnas={["Usuario", "Registro", "Cursos activados", "Pedidos", ""]}
          vacia={usuarios.length === 0 && "No hay ninguna cuenta que coincida con la búsqueda."}
        >
          {usuarios.map((u, i) => (
            <Fragment key={u.id}>
              {/* Arriba los empleados; debajo, los clientes */}
              {(i === 0 || esDelEquipo(usuarios[i - 1].rol) !== esDelEquipo(u.rol)) && (
                <tr>
                  <td
                    colSpan={5}
                    className="bg-niebla text-xs font-semibold tracking-wide text-gris uppercase"
                  >
                    {esDelEquipo(u.rol) ? `Empleados (${totalEmpleados})` : "Clientes"}
                  </td>
                </tr>
              )}
              <tr>
                <td>
                  <p className="font-medium">
                    {u.nombre} {u.rol === "ADMIN" && <Insignia tono="acento">Admin</Insignia>}
                    {u.rol === "EDITOR" && <Insignia tono="aviso">Editor</Insignia>}
                    {u.rol === "HARDWARE" && <Insignia tono="exito">Hardware</Insignia>}
                  </p>
                  <p className="text-xs text-gris">{u.email}</p>
                  {esDelEquipo(u.rol) && (
                    <p className="mt-0.5 text-xs text-gris">
                      Última conexión: {textoConexion(u.ultimaConexion, ahora)}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap text-gris">{fecha(u.creadoEn)}</td>
                <td>
                  {u.cursos.length === 0 ? (
                    <span className="text-gris">Ninguno</span>
                  ) : (
                    <ul className="flex flex-wrap gap-1">
                      {u.cursos.map((c) => (
                        <li key={c.id}>
                          <Insignia>{c.titulo}</Insignia>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="tabular-nums">{u.pedidos}</td>
                <td className="text-right">
                  <BotonesRol usuario={u} />
                </td>
              </tr>
            </Fragment>
          ))}
        </Tabla>
        <Paginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          ruta="/admin/usuarios"
          filtros={{ q }}
        />
      </Caja>
    </>
  );
}

/** Qué hace cada rol de trabajo, para la ventana de confirmar */
const ROLES = {
  EDITOR: {
    nombre: "editor",
    dar: "podrá entrar en el panel de editor y ver los guiones que le asignes.",
    quitar: "dejará de ver el panel de editor y volverá a ser cliente.",
  },
  HARDWARE: {
    nombre: "hardware",
    dar: "tendrá su espacio de archivos en /hardware (solo lo veréis esa persona y tú).",
    quitar:
      "dejará de ver su espacio y volverá a ser cliente. Sus archivos NO se borran: los sigues viendo en Hardware.",
  },
} as const;

/**
 * Botones para dar o quitar un rol de trabajo. Un cliente puede pasar a editor o a hardware; quien ya
 * tiene uno, solo puede volver a cliente (una persona, un rol). Al admin no se le toca.
 */
function BotonesRol({ usuario }: { usuario: { id: string; nombre: string; rol: Rol } }) {
  if (usuario.rol === "ADMIN") return null;
  const roles = usuario.rol === "CLIENTE" ? (["EDITOR", "HARDWARE"] as const) : [usuario.rol];
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {roles.map((rol) => {
        if (rol !== "EDITOR" && rol !== "HARDWARE") return null;
        const r = ROLES[rol];
        const dar = usuario.rol === "CLIENTE";
        return (
          <BotonConfirmar
            key={rol}
            accion={cambiarRolTrabajo}
            datos={{ usuarioId: usuario.id, rol, dar: dar ? "si" : "no" }}
            titulo={dar ? `Hacer ${r.nombre}` : `Quitar el rol de ${r.nombre}`}
            texto={
              dar
                ? `${usuario.nombre} ${r.dar} Sigue siendo cliente de la tienda.`
                : `${usuario.nombre} ${r.quitar}`
            }
            confirmar={dar ? `Sí, hacer ${r.nombre}` : "Sí, quitar"}
            variante="secundario"
            pequeno
          >
            {dar ? `Hacer ${r.nombre}` : `Quitar ${r.nombre}`}
          </BotonConfirmar>
        );
      })}
    </div>
  );
}
