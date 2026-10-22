import type { Metadata } from "next";
import Link from "next/link";
import { borrarPendiente, reenviarVerificacion } from "@/app/admin/usuarios/acciones";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Buscador } from "@/components/admin/Buscador";
import { Cabecera } from "@/components/admin/Cabecera";
import { Caja } from "@/components/admin/Caja";
import { Insignia } from "@/components/admin/Insignia";
import { leerPagina, Paginacion } from "@/components/admin/Paginacion";
import { Tabla } from "@/components/admin/Tabla";
import { fecha, fechaHora } from "@/lib/admin/formato";
import { buscarUsuarios, contarUsuarios, type EstadoUsuario } from "@/lib/admin/usuarios";
import { exigirAdmin } from "@/lib/sesion";
import { cn, plural } from "@/lib/utils";
import { limpiarPendientesCaducados } from "@/lib/verificacion/pendientes";
import { DIAS_CUENTA_PENDIENTE } from "@/lib/verificacion/reglas";

export const metadata: Metadata = { title: "Usuarios" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

const ESTADOS: { id?: EstadoUsuario; nombre: string }[] = [
  { nombre: "Todos" },
  { id: "verificados", nombre: "Verificados" },
  { id: "pendientes", nombre: "Pendientes" },
];

/**
 * USUARIOS: lista con buscador por email o nombre y filtro por estado.
 * Filtros en la dirección: ?q=…&estado=verificados|pendientes
 * Las cuentas pendientes (no han escrito el código del correo) llevan su etiqueta y
 * los botones para reenviar el código o borrarlas.
 */
export default async function UsuariosAdmin({ searchParams }: Props) {
  await exigirAdmin("/admin/usuarios");
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q : "";
  const estado = ESTADOS.find((e) => e.id && e.id === parametros.estado)?.id;
  const pagina = leerPagina(parametros.pagina);

  // Las que llevan más de una semana sin confirmar se borran antes de enseñar la lista
  await limpiarPendientesCaducados();
  const [{ usuarios, total, totalPaginas }, cuentas] = await Promise.all([
    buscarUsuarios(q, pagina, estado),
    contarUsuarios(),
  ]);

  const enlace = (nuevoEstado?: EstadoUsuario) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nuevoEstado) params.set("estado", nuevoEstado);
    const t = params.toString();
    return `/admin/usuarios${t ? `?${t}` : ""}`;
  };
  const chip = (activo: boolean) =>
    cn(
      "rounded-md px-2.5 py-1 ring-1",
      activo ? "bg-tinta text-white ring-tinta" : "bg-white ring-linea hover:ring-tinta/40",
    );

  return (
    <>
      <Cabecera
        titulo="Usuarios"
        descripcion={`${plural(cuentas.verificados, "cuenta verificada", "cuentas verificadas")} · ${plural(cuentas.pendientes, "pendiente", "pendientes")} de verificar`}
      />
      <div className="mb-4 space-y-3">
        <Buscador
          valor={q}
          placeholder="Buscar por email o nombre"
          etiqueta="Buscar usuarios"
          extra={{ estado }}
        />
        <div className="flex flex-wrap gap-1.5 text-[13px]">
          {ESTADOS.map((e) => (
            <Link key={e.nombre} href={enlace(e.id)} className={chip(estado === e.id)}>
              {e.nombre}
            </Link>
          ))}
        </div>
        {estado === "pendientes" && (
          <p className="text-xs text-gris">
            Se registraron pero no escribieron el código del correo: no pueden entrar ni cuentan en
            las cifras. Se borran solas a los {DIAS_CUENTA_PENDIENTE} días.
          </p>
        )}
      </div>

      <Caja sinRelleno>
        <p className="border-b border-linea px-4 py-2 text-xs text-gris">
          {q
            ? `${plural(total, "cuenta encontrada", "cuentas encontradas")} para «${q}»`
            : plural(total, "cuenta", "cuentas")}
        </p>
        <Tabla
          columnas={["Usuario", "Estado", "Registro", "Cursos activados", "Pedidos", ""]}
          vacia={usuarios.length === 0 && "No hay ninguna cuenta con estos filtros."}
        >
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>
                <p className="font-medium">
                  {u.nombre} {u.rol === "ADMIN" && <Insignia tono="acento">Admin</Insignia>}
                </p>
                <p className="text-xs text-gris">{u.email}</p>
              </td>
              <td>
                {u.emailVerificadoEn ? (
                  <Insignia tono="exito">Verificado</Insignia>
                ) : (
                  <>
                    <Insignia tono="aviso">Pendiente</Insignia>
                    {u.ultimoCodigoEn && (
                      <p className="mt-1 text-xs whitespace-nowrap text-gris">
                        Último código: {fechaHora(u.ultimoCodigoEn)}
                      </p>
                    )}
                  </>
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
              <td>
                {!u.emailVerificadoEn && u.rol === "CLIENTE" && (
                  <div className="flex justify-end gap-1.5">
                    <BotonConfirmar
                      accion={reenviarVerificacion}
                      datos={{ id: u.id }}
                      titulo="¿Reenviar el código?"
                      texto={
                        <>
                          Le llegará a <strong>{u.email}</strong> un correo con un código nuevo y un
                          botón para escribirlo. El código anterior dejará de valer.
                        </>
                      }
                      confirmar="Sí, reenviar"
                      variante="secundario"
                      pequeno
                    >
                      Reenviar código
                    </BotonConfirmar>
                    <BotonConfirmar
                      accion={borrarPendiente}
                      datos={{ id: u.id }}
                      titulo="¿Eliminar esta cuenta?"
                      texto={
                        <>
                          Se borra la cuenta de <strong>{u.email}</strong>, que nunca confirmó su
                          email, junto con sus códigos. Si más adelante quiere entrar, tendrá que
                          registrarse otra vez.
                        </>
                      }
                      confirmar="Sí, eliminar"
                      pequeno
                    >
                      Eliminar
                    </BotonConfirmar>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Tabla>
        <Paginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          ruta="/admin/usuarios"
          filtros={{ q, estado }}
        />
      </Caja>
    </>
  );
}
