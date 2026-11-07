import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { borrarRegistradoBienvenida } from "@/app/admin/codigos/personas/acciones";
import { BotonConfirmar } from "@/components/admin/BotonConfirmar";
import { Cabecera } from "@/components/admin/Cabecera";
import { Tabla } from "@/components/admin/Tabla";
import { listarRegistradosBienvenida } from "@/lib/admin/bienvenida";
import { fechaHora } from "@/lib/admin/formato";
import { exigirAdmin } from "@/lib/sesion";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Registrados con tarjeta de bienvenida" };

/**
 * PERSONAS REGISTRADAS CON UNA TARJETA DE BIENVENIDA: quién, con qué tarjeta y cuándo, y botón para
 * borrar la cuenta (con confirmación).
 */
export default async function PersonasBienvenida() {
  await exigirAdmin("/admin/codigos/personas");
  const personas = await listarRegistradosBienvenida();

  return (
    <>
      <Cabecera
        titulo="Registrados con tarjeta de bienvenida"
        descripcion={plural(personas.length, "persona", "personas")}
        volver={{ href: "/admin/codigos", etiqueta: "Códigos" }}
      />
      <Tabla
        columnas={["Persona", "Tarjeta", "Cuándo", ""]}
        etiqueta="Personas registradas con tarjeta de bienvenida"
        vacia={personas.length === 0 && "Todavía no se ha registrado nadie con una tarjeta."}
      >
        {personas.map((p) => (
          <tr key={p.codigoId}>
            <td>
              <p className="font-medium">{p.usuario.nombre}</p>
              <p className="text-xs break-all text-gris">{p.usuario.email}</p>
            </td>
            <td className="font-mono text-[13px] whitespace-nowrap">{p.codigo}</td>
            <td className="whitespace-nowrap">{p.usadoEn && fechaHora(p.usadoEn)}</td>
            <td className="text-right">
              {p.motivoNoBorrar ? (
                <span className="text-xs text-gris">{p.motivoNoBorrar}</span>
              ) : (
                <BotonConfirmar
                  accion={borrarRegistradoBienvenida}
                  datos={{ usuarioId: p.usuario.id }}
                  titulo={`¿Borrar la cuenta de ${p.usuario.nombre}?`}
                  texto={
                    <>
                      Se borrará la cuenta <strong>{p.usuario.email}</strong> con todo lo suyo
                      (progreso, dispositivos…). No se puede deshacer. Su tarjeta{" "}
                      <strong>{p.codigo}</strong> volverá a quedar libre y dejará de contar como
                      registro.
                    </>
                  }
                  confirmar="Sí, borrar la cuenta"
                  pequeno
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Borrar
                </BotonConfirmar>
              )}
            </td>
          </tr>
        ))}
      </Tabla>
    </>
  );
}
