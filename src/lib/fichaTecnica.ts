/**
 * Datos técnicos de un componente listos para mostrar en una tabla.
 * Junta los datos "eléctricos" (voltios, consumo, pines) con las especificaciones
 * extra de data/componentes.json. Se usa en el configurador y en /componentes.
 */
import { formatearNumero } from "@/lib/utils";
import type { ComponenteCatalogo, Especificacion } from "@/types/catalogo";

export function fichaTecnica(c: ComponenteCatalogo): Especificacion[] {
  const esBateria = c.tipo === "bateria";
  const esPlaca = c.tipo === "placa";
  const datos: Especificacion[] = [];

  if (c.voltaje > 0) {
    datos.push({
      nombre: esBateria ? "Tensión que entrega" : "Tensión de trabajo",
      valor: `${formatearNumero(c.voltaje)} V`,
    });
  }
  if (c.voltajeLogico != null) {
    datos.push({ nombre: "Señales (lógica)", valor: `${formatearNumero(c.voltajeLogico)} V` });
  }
  if (c.consumoMa > 0) {
    datos.push({
      nombre: esBateria ? "Corriente máxima" : "Consumo",
      valor: `${formatearNumero(c.consumoMa)} mA`,
    });
  }
  if (c.pines > 0) {
    datos.push({
      nombre: esPlaca ? "Pines disponibles" : "Pines que ocupa",
      valor: String(c.pines),
    });
  }
  datos.push({ nombre: "Conexión", valor: c.conector });

  return [...datos, ...c.especificaciones];
}
