import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Buscador } from "@/components/admin/Buscador";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { leerPagina, Paginacion } from "@/components/admin/Paginacion";
import { Tabla } from "@/components/admin/Tabla";
import { fecha } from "@/lib/admin/formato";
import { buscarUsuarios } from "@/lib/admin/usuarios";
import { exigirAdmin } from "@/lib/sesion";
import { cambiarRolEditor } from "./acciones";
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
  const { usuarios, total, totalPaginas } = await buscarUsuarios(q, pagina);

  return (
    <>
      <Cabecera
        titulo="Usuarios"
        descripcion={
          q
            ? `${plural(total, "cuenta encontrada", "cuentas encontradas")} para «${q}»`
            : plural(total, "cuenta registrada", "cuentas registradas")
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
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>
                <p className="font-medium">
                  {u.nombre} {u.rol === "ADMIN" && <Insignia tono="acento">Admin</Insignia>}
                  {u.rol === "EDITOR" && <Insignia tono="aviso">Editor</Insignia>}
                </p>
                <p className="text-xs text-gris">{u.email}</p>
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
                {u.rol !== "ADMIN" && (
                  <BotonConfirmar
                    accion={cambiarRolEditor}
                    datos={{ usuarioId: u.id, hacerEditor: u.rol === "EDITOR" ? "no" : "si" }}
                    titulo={u.rol === "EDITOR" ? "Quitar el rol de editor" : "Hacer editor"}
                    texto={
                      u.rol === "EDITOR"
                        ? `${u.nombre} dejará de ver el panel de editor y volverá a ser cliente.`
                        : `${u.nombre} podrá entrar en el panel de editor y ver los guiones que le asignes. Sigue siendo cliente de la tienda.`
                    }
                    confirmar={u.rol === "EDITOR" ? "Sí, quitar" : "Sí, hacer editor"}
                    variante="secundario"
                    pequeno
                  >
                    {u.rol === "EDITOR" ? "Quitar editor" : "Hacer editor"}
                  </BotonConfirmar>
                )}
              </td>
            </tr>
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
