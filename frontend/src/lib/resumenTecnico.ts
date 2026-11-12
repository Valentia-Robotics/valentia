/**
 * RESUMEN TÉCNICO DE UN ROBOT (kit o montaje del configurador), calculado con el mismo motor de
 * compatibilidad que el configurador: placa, actuadores, sensores, alimentación, GPIO en uso y
 * consumo frente a lo que da la batería. Puro (sin BD): sirve en el servidor y en el navegador.
 */
import { comprobarRobot, type PiezaConDatos } from "@/lib/compatibilidad";

export interface ResumenTecnico {
  mcu: string | null;
  logica: number | null;
  actuadores: string | null;
  sensores: number;
  alimentacion: string | null;
  gpio: { usados: number; disponibles: number } | null;
  corriente: { usados: number; disponibles: number } | null;
  /** Consumo de pico de todo lo que no es batería (mA), haya fuente o no */
  consumoMa: number;
  errores: number;
  advertencias: number;
  /** Ids de las reglas que avisan (p. ej. «logica-5v-en-placa-3v3») */
  avisos: string[];
}

const decimal = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });

export function resumenTecnico(piezas: PiezaConDatos[]): ResumenTecnico {
  const placa = piezas.find((p) => p.componente.tipo === "placa")?.componente;
  const bateria = piezas.find((p) => p.componente.tipo === "bateria")?.componente;
  const cuantos = (tipo: string) =>
    piezas.filter((p) => p.componente.tipo === tipo).reduce((n, p) => n + p.cantidad, 0);
  const dc = cuantos("motor-dc");
  const servos = cuantos("servo");
  const diagnostico = comprobarRobot(piezas);
  const medidor = (id: string) => {
    const m = diagnostico.medidores.find((x) => x.id === id);
    return m ? { usados: m.usados, disponibles: m.disponibles } : null;
  };
  return {
    mcu: placa ? placa.nombre.replace(/^Placa\s+/i, "").replace(/\s+con wifi$/i, "") : null,
    logica: placa?.voltajeLogico ?? null,
    actuadores:
      [dc ? `${dc}× DC` : null, servos ? `${servos}× servo` : null].filter(Boolean).join(" + ") ||
      null,
    sensores: piezas
      .filter((p) => p.componente.categoria === "SENSORES")
      .reduce((n, p) => n + p.cantidad, 0),
    alimentacion: bateria ? `${decimal(bateria.voltaje)} V · ${decimal(bateria.consumoMa)} mA` : null,
    gpio: medidor("pines"),
    corriente: medidor("corriente"),
    consumoMa: piezas
      .filter((p) => p.componente.tipo !== "bateria")
      .reduce((n, p) => n + p.componente.consumoMa * p.cantidad, 0),
    errores: diagnostico.errores,
    advertencias: diagnostico.advertencias,
    avisos: diagnostico.avisos.map((a) => a.id),
  };
}
