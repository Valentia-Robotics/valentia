import { Led } from "@/components/ui/Led";
import { MarcoCAD } from "@/components/ui/MarcoCAD";
import { EsquemaBloques } from "./EsquemaBloques";
import type { Robot } from "./useRobot";

/**
 * BANCO DE PRUEBAS (cabecera del configurador): el esquema de bloques del montaje, que se redibuja con
 * cada pieza que se añade o se quita, y el estado general (errores y advertencias) con su LED.
 */
export function BancoPruebas({ robot, className }: { robot: Robot; className?: string }) {
  const { errores, advertencias } = robot.diagnostico;
  const vacio = robot.piezas.length === 0;
  return (
    <MarcoCAD
      etiqueta="Esquema de bloques · en vivo"
      cota={
        <span className="tabular-nums">
          <span className={errores ? "text-error" : undefined}>ERR {errores}</span>
          {" · "}
          <span className={advertencias ? "text-aviso" : undefined}>WARN {advertencias}</span>
        </span>
      }
      className={className}
    >
      <div className="p-4 pt-6 sm:p-5 sm:pt-7">
        <EsquemaBloques piezas={robot.piezas} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-3">
          <Led
            estado={vacio ? "apagado" : errores ? "error" : advertencias ? "aviso" : "ok"}
            parpadeo={errores > 0}
            texto={
              vacio
                ? "Banco vacío · empieza por la placa"
                : errores
                  ? "No funcional · revisa el registro"
                  : advertencias
                    ? "Funcional con advertencias"
                    : "Montaje válido"
            }
          />
          <span className="mono-etiqueta text-gris-claro">
            Potencia <span className="text-acento">━</span> · Señal{" "}
            <span className="text-tinta/45">━</span>
          </span>
        </div>
      </div>
    </MarcoCAD>
  );
}
