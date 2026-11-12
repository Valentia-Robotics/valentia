/**
 * DESPIECE DEL VR1 (portada): las cinco capas del coche, en el orden en que se explican, con sus
 * especificaciones. Son datos del producto físico (catálogo + decisiones de Jesse: ESP32, HC-SR04P,
 * dos baterías 18650 incluidas, montaje con imanes y pines pogo). Si cambia una pieza del kit, se
 * cambia aquí.
 * Archivo sin "three": se puede importar sin coste.
 */
import type { PiezaRobot } from "@/components/portada/piezasRobot";

export interface CapaDespiece {
  id: PiezaRobot["id"];
  /** Nombre corto de la capa (etiqueta de la línea de cota) */
  nombre: string;
  /** Una línea con lo esencial, en la etiqueta */
  resumen: string;
  /** Tabla completa, cuando la capa está activa */
  datos: { nombre: string; valor: string }[];
}

export const CAPAS_VR1: CapaDespiece[] = [
  {
    id: "chasis",
    nombre: "Chasis",
    resumen: "PMMA 3 mm · 210 × 150 mm",
    datos: [
      { nombre: "Material", valor: "Metacrilato (PMMA) 3 mm, corte láser" },
      { nombre: "Huella", valor: "210 × 150 mm · perfil bajo" },
      { nombre: "Tracción", valor: "Diferencial 2WD · Ø65 mm + rueda loca" },
      { nombre: "Acoplamiento", valor: "Imanes + pines pogo · tornillería M3" },
    ],
  },
  {
    id: "placa",
    nombre: "PCB / Control",
    resumen: "ESP32 · Xtensa LX6 · 240 MHz",
    datos: [
      { nombre: "MCU", valor: "ESP32 DevKit · 2 núcleos Xtensa LX6, 240 MHz" },
      { nombre: "Radio", valor: "Wi-Fi 2,4 GHz · Bluetooth 4.2 / BLE" },
      { nombre: "E/S", valor: "25 GPIO · lógica 3,3 V · PWM · ADC 12 bit" },
      { nombre: "Programación", valor: "USB-C · C++ (Arduino)" },
      { nombre: "Consumo", valor: "240 mA pico con Wi-Fi activo" },
    ],
  },
  {
    id: "motores",
    nombre: "Motores",
    resumen: "2× DC 1:48 · driver L298N",
    datos: [
      { nombre: "Actuadores", valor: "2× motor DC con reductora 1:48" },
      { nombre: "Régimen", valor: "3 – 6 V · 200 rpm a 6 V" },
      { nombre: "Consumo", valor: "≈ 200 mA por motor en marcha" },
      { nombre: "Driver", valor: "L298N · doble puente H · 2 A por canal" },
      { nombre: "Control", valor: "PWM (velocidad) + 2 GPIO de sentido por motor" },
    ],
  },
  {
    id: "sensores",
    nombre: "Sensores",
    resumen: "2× TCRT5000 · HC-SR04P",
    datos: [
      { nombre: "Línea", valor: "2× TCRT5000 · IR reflexivo, 1 – 25 mm" },
      { nombre: "Salida", valor: "Digital con umbral ajustable" },
      { nombre: "Distancia", valor: "HC-SR04P · 2 cm – 4 m · ± 3 mm · 15°" },
      { nombre: "Lógica", valor: "3,3 – 5 V: directo a la ESP32" },
      { nombre: "Lazo", valor: "Seguimiento de línea en lazo cerrado" },
    ],
  },
  {
    id: "bateria",
    nombre: "Alimentación",
    resumen: "2S 18650 Li-ion · 7,4 V",
    datos: [
      { nombre: "Celdas", valor: "2× 18650 Li-ion en serie (2S), incluidas" },
      { nombre: "Tensión", valor: "7,4 V nominal · recargables" },
      { nombre: "Corriente", valor: "Hasta 3 A" },
      { nombre: "Reparto", valor: "Motores vía L298N · 5 V regulados a la placa" },
    ],
  },
];
