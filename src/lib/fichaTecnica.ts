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

  // Sin nombres repetidos (p. ej. "Corriente máxima" calculada y también escrita en las
  // especificaciones): se queda el primero. Además, el nombre se usa como key en las tablas.
  const vistos = new Set<string>();
  return [...datos, ...c.especificaciones].filter((dato) => {
    const clave = dato.nombre.trim().toLowerCase();
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}
