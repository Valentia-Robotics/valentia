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
import {
  esDelEquipo,
  esJefe,
  nombreEditor,
  nombreRol,
  textoConexion,
  tieneAccesoAdmin,
} from "@/config/equipo";
import { ORIGEN_QR } from "@/config/llegada";
import { fecha } from "@/lib/admin/formato";
import { buscarUsuarios } from "@/lib/admin/usuarios";
import { exigirAdmin } from "@/lib/sesion";
import type { Rol } from "@/generated/prisma/enums";
import {
  cambiarFormaPuesto,
  cambiarRolTrabajo,
  cambiarTambienEditor,
  cambiarTambienHardware,
} from "./acciones";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Usuarios" };

interface Props {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

/** USUARIOS: lista con buscador por email o nombre */
export default async function UsuariosAdmin({ searchParams }: Props) {
  const yo = await exigirAdmin("/admin/usuarios");
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
          columnas={[
            "Usuario",
            "Registro",
            "Navegador y llegada",
            "Cursos activados",
            "Pedidos",
            "",
          ]}
          vacia={usuarios.length === 0 && "No hay ninguna cuenta que coincida con la búsqueda."}
        >
          {usuarios.map((u, i) => (
            <Fragment key={u.id}>
              {/* Arriba los empleados; debajo, los clientes */}
              {(i === 0 || esDelEquipo(usuarios[i - 1].rol) !== esDelEquipo(u.rol)) && (
                <tr>
                  <td
                    colSpan={6}
                    className="bg-niebla text-xs font-semibold tracking-wide text-gris uppercase"
                  >
                    {esDelEquipo(u.rol) ? `Empleados (${totalEmpleados})` : "Clientes"}
                  </td>
                </tr>
              )}
              <tr>
                <td>
                  <p className="font-medium">
                    {u.nombre}{" "}
                    {esDelEquipo(u.rol) && (
                      <Insignia tono={TONO_ROL[u.rol] ?? "neutro"}>
                        {nombreRol(u.rol, u.rolFemenino)}
                      </Insignia>
                    )}{" "}
                    {tieneAccesoAdmin(u.rol) && u.tambienEditor && (
                      <Insignia tono="aviso">
                        También {nombreEditor(u.rolFemenino).toLowerCase()}
                      </Insignia>
                    )}{" "}
                    {tieneAccesoAdmin(u.rol) && u.tambienHardware && (
                      <Insignia tono="aviso">También hardware</Insignia>
                    )}
                  </p>
                  <p className="text-xs text-gris">{u.email}</p>
                  {esDelEquipo(u.rol) && (
                    <p className="mt-0.5 text-xs text-gris">
                      Última conexión: {textoConexion(u.ultimaConexion, ahora)}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap text-gris">{fecha(u.creadoEn)}</td>
                <td className="text-xs">
                  {/* Solo para clientes: el equipo no se mide */}
                  {!esDelEquipo(u.rol) && (
                    <ComoLlego
                      navegador={u.navegadorRegistro}
                      ultimo={u.navegadorUltimo}
                      origen={u.origenLlegada}
                    />
                  )}
                </td>
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
                  <BotonesRol usuario={u} yo={yo} />
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

/**
 * Con qué navegador se registró (y con cuál entró la última vez, si es otro) y cómo llegó a la
 * web: QR de una tarjeta, Google, Instagram, directo… Las cuentas creadas antes del 12-11-2026
 * no lo tienen apuntado: «Desconocido» (del navegador se ve al menos el último acceso).
 */
function ComoLlego({
  navegador,
  ultimo,
  origen,
}: {
  navegador: string | null;
  ultimo: string | null;
  origen: string | null;
}) {
  return (
    <div className="space-y-1">
      <p>
        <span className="text-gris">Navegador: </span>
        {navegador ?? ultimo ?? <span className="text-gris">Desconocido</span>}
      </p>
      {ultimo && ultimo !== (navegador ?? ultimo) && (
        <p>
          <span className="text-gris">Último acceso: </span>
          {ultimo}
        </p>
      )}
      <p>
        <span className="text-gris">Llegó por: </span>
        {origen ? (
          <Insignia tono={origen === ORIGEN_QR ? "exito" : "neutro"}>{origen}</Insignia>
        ) : (
          <span className="text-gris">Desconocido</span>
        )}
      </p>
    </div>
  );
}

/** Color de la etiqueta de cada puesto */
const TONO_ROL: Partial<Record<Rol, "acento" | "aviso" | "exito">> = {
  ADMIN: "acento",
  SIGMA: "acento",
  EDITOR: "aviso",
  HARDWARE: "exito",
};

interface UsuarioFila {
  id: string;
  nombre: string;
  rol: Rol;
  tambienEditor: boolean | null;
  tambienHardware: boolean | null;
  rolFemenino: boolean | null;
}

/**
 * Botones de cada fila:
 *   - Cliente: hacer editor, hacer editora o hacer hardware.
 *   - Editor o hardware: quitar el puesto (vuelve a cliente). Una persona, un rol.
 *   - Administrador o sigma: hacerle también editor/editora o también hardware (su propio espacio de
 *     archivos), o quitárselo. Su rol de admin no se toca aquí.
 *   - Editor y administrador: cambiar cómo se dice su puesto (masculino o femenino).
 *   - Sigma: solo un ADMIN lo da («Hacer sigma» en un cliente) o lo quita. Un sigma no ve botones en
 *     las cuentas de administración (ADMIN u otro sigma), salvo en la suya.
 */
function BotonesRol({ usuario, yo }: { usuario: UsuarioFila; yo: { id: string; rol: Rol } }) {
  const { id: usuarioId, nombre, rol } = usuario;
  const comun = { variante: "secundario" as const, pequeno: true };
  const jefe = esJefe(yo.rol);
  if (tieneAccesoAdmin(rol) && !jefe && usuarioId !== yo.id) return null;

  const botonForma = (rol === "EDITOR" || rol === "ADMIN") && (
    <BotonConfirmar
      {...comun}
      accion={cambiarFormaPuesto}
      datos={{ usuarioId, femenino: usuario.rolFemenino ? "no" : "si" }}
      titulo="Cómo se dice su puesto"
      texto={`Su puesto se mostrará como «${nombreRol(rol, !usuario.rolFemenino)}» en el panel y en el equipo.`}
      confirmar="Sí, cambiar"
    >
      Llamar «{nombreRol(rol, !usuario.rolFemenino)}»
    </BotonConfirmar>
  );

  if (tieneAccesoAdmin(rol)) {
    const editorA = nombreEditor(usuario.rolFemenino).toLowerCase();
    const puestoAdmin = rol === "SIGMA" ? "sigma" : "administrador";
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {usuario.tambienEditor ? (
          <BotonConfirmar
            {...comun}
            accion={cambiarTambienEditor}
            datos={{ usuarioId, dar: "no" }}
            titulo={`Quitar «también ${editorA}»`}
            texto={`${nombre} sigue siendo ${puestoAdmin}, pero deja de tener «Mis guiones» y de salir al asignar guiones.`}
            confirmar="Sí, quitar"
          >
            Quitar {editorA}
          </BotonConfirmar>
        ) : (
          <BotonConfirmar
            {...comun}
            accion={cambiarTambienEditor}
            datos={{ usuarioId, dar: "si" }}
            titulo={`Hacer también ${editorA}`}
            texto={`${nombre} sigue siendo ${puestoAdmin} y, además, tendrá «Mis guiones» en su menú: podrá escribir sus propias ideas y le podrás asignar guiones.`}
            confirmar="Sí, hacer"
          >
            Hacer también {editorA}
          </BotonConfirmar>
        )}
        {usuario.tambienHardware ? (
          <BotonConfirmar
            {...comun}
            accion={cambiarTambienHardware}
            datos={{ usuarioId, dar: "no" }}
            titulo="Quitar «también hardware»"
            texto={`${nombre} sigue siendo ${puestoAdmin}, pero deja de tener «Mi espacio». Sus archivos no se borran: siguen en Hardware.`}
            confirmar="Sí, quitar"
          >
            Quitar hardware
          </BotonConfirmar>
        ) : (
          <BotonConfirmar
            {...comun}
            accion={cambiarTambienHardware}
            datos={{ usuarioId, dar: "si" }}
            titulo="Hacer también hardware"
            texto={`${nombre} sigue siendo ${puestoAdmin} y, además, tendrá su propio espacio de archivos («Mi espacio»), como el equipo de hardware.`}
            confirmar="Sí, hacer"
          >
            Hacer también hardware
          </BotonConfirmar>
        )}
        {botonForma}
        {rol === "SIGMA" && jefe && (
          <BotonConfirmar
            {...comun}
            accion={cambiarRolTrabajo}
            datos={{ usuarioId, rol: "SIGMA", dar: "no" }}
            titulo="Quitar el rol de sigma"
            texto={`${nombre} ${QUE_HACE.SIGMA.quitar}`}
            confirmar="Sí, quitar"
          >
            Quitar sigma
          </BotonConfirmar>
        )}
      </div>
    );
  }

  if (rol === "CLIENTE") {
    const opciones = [
      { rol: "EDITOR", femenino: false, texto: "editor" },
      { rol: "EDITOR", femenino: true, texto: "editora" },
      { rol: "HARDWARE", femenino: false, texto: "hardware" },
      // SIGMA: solo lo da un ADMIN
      ...(jefe ? [{ rol: "SIGMA", femenino: false, texto: "sigma" } as const] : []),
    ] as const;
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {opciones.map((o) => (
          <BotonConfirmar
            {...comun}
            key={o.texto}
            accion={cambiarRolTrabajo}
            datos={{ usuarioId, rol: o.rol, dar: "si", femenino: o.femenino ? "si" : "no" }}
            titulo={`Hacer ${o.texto}`}
            texto={`${nombre} ${QUE_HACE[o.rol].dar} Sigue siendo cliente de la tienda.`}
            confirmar={`Sí, hacer ${o.texto}`}
          >
            Hacer {o.texto}
          </BotonConfirmar>
        ))}
      </div>
    );
  }

  if (rol !== "EDITOR" && rol !== "HARDWARE") return null;
  const puesto = nombreRol(rol, usuario.rolFemenino).toLowerCase();
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <BotonConfirmar
        {...comun}
        accion={cambiarRolTrabajo}
        datos={{ usuarioId, rol, dar: "no" }}
        titulo={`Quitar el rol de ${puesto}`}
        texto={`${nombre} ${QUE_HACE[rol].quitar}`}
        confirmar="Sí, quitar"
      >
        Quitar {puesto}
      </BotonConfirmar>
      {botonForma}
    </div>
  );
}

/** Qué hace cada rol de trabajo, para la ventana de confirmar */
const QUE_HACE = {
  EDITOR: {
    dar: "podrá entrar en «Mis guiones»: los guiones que le asignes y sus propias ideas.",
    quitar: "dejará de ver «Mis guiones» y volverá a ser cliente.",
  },
  HARDWARE: {
    dar: "tendrá su espacio de archivos en /hardware (solo lo veréis esa persona y tú).",
    quitar:
      "dejará de ver su espacio y volverá a ser cliente. Sus archivos NO se borran: los sigues viendo en Hardware.",
  },
  SIGMA: {
    dar: "tendrá los mismos accesos que un administrador en todo el panel, pero por debajo de ti: no podrá cambiar nada de las cuentas de administración ni dar o quitar el rol de sigma.",
    quitar: "deja de entrar en el panel de administración y vuelve a ser cliente.",
  },
} as const;
