/**
 * ============================================================
 *  REGLAS DE COMPATIBILIDAD DEL CONFIGURADOR
 *  Son DATOS: para cambiar un aviso, añadir una regla o ajustar un
 *  límite, edita esta lista. No hace falta tocar nada más.
 * ============================================================
 *
 * Cada regla tiene un "tipo" (ver tipos.ts para todos los detalles):
 *   necesita  → unas piezas necesitan otras (un motor necesita un driver)
 *   maximo    → no más de X piezas de un tipo (una sola placa)
 *   voltaje   → los voltios de una pieza frente a los de la placa o la batería
 *   capacidad → pines de la placa o corriente de la batería: lo usado frente a lo que hay
 *
 * Los "tipos" de pieza (placa, motor-dc, servo, bateria…) son el campo "tipo"
 * de cada componente en data/componentes.json.
 *
 * En los mensajes, lo que va entre llaves ({piezas}, {usados}…) se rellena solo.
 */
import type { Regla } from "./tipos";

export const reglas: Regla[] = [
  /* ---------- Piezas que necesitan otras ---------- */
  {
    tipo: "necesita",
    id: "necesita-placa",
    si: { categorias: ["MOTORES", "SENSORES", "EXTRAS"], excepto: ["protoboard"] },
    necesita: { tipos: ["placa"] },
    nivel: "error",
    titulo: "Sin MCU",
    mensaje:
      "{piezas} necesitan un microcontrolador (Arduino o ESP32) que lea sus señales o genere su control. Sin placa no hay lazo de control.",
    sugerencia: "arduino-uno-r3",
    requisito: "Un microcontrolador (Arduino o ESP32)",
  },
  {
    tipo: "necesita",
    id: "motor-necesita-driver",
    si: { tipos: ["motor-dc"] },
    necesita: { tipos: ["driver-motores"] },
    unoPorCada: 2,
    nivel: "error",
    titulo: "Motor DC sin etapa de potencia",
    mensaje:
      "Un GPIO entrega unos 20 mA; un motor DC arranca con cientos. Cada puente H doble controla 2 motores: con {cantidad} motores necesitas {necesarias} drivers y hay {tienes}.",
    sugerencia: "driver-motores-l298n",
    requisito: "Un driver de motores (puente H; 2 motores por driver)",
  },
  {
    tipo: "necesita",
    id: "motores-necesitan-bateria",
    si: { tipos: ["motor-dc", "servo"] },
    necesita: { tipos: ["bateria"] },
    nivel: "error",
    titulo: "Actuadores sin fuente de potencia",
    mensaje:
      "Motores y servos superan los 500 mA que da un puerto USB 2.0. Añade una batería o un portapilas como fuente de potencia.",
    sugerencia: "portapilas-4xaa",
    requisito: "Batería o portapilas: el USB no da corriente suficiente",
  },
  {
    tipo: "necesita",
    id: "motores-necesitan-chasis",
    si: { tipos: ["motor-dc"] },
    necesita: { tipos: ["chasis-coche"] },
    nivel: "info",
    titulo: "Motores sin soporte mecánico",
    mensaje:
      "El chasis 2WD trae ruedas, rueda loca y los taladros para fijar los motores con tornillería M3.",
    sugerencia: "chasis-coche-2wd",
  },
  {
    tipo: "necesita",
    id: "placa-sin-bateria",
    si: { tipos: ["placa"] },
    necesita: { tipos: ["bateria"] },
    nivel: "info",
    titulo: "Alimentación solo por USB",
    mensaje:
      "Sin batería, la placa funciona a 5 V desde el USB del ordenador: válido en banco de pruebas. Para un montaje autónomo, añade una fuente.",
    sugerencia: "portapilas-4xaa",
  },

  /* ---------- Límites ---------- */
  {
    tipo: "maximo",
    id: "una-sola-placa",
    si: { tipos: ["placa"] },
    maximo: 1,
    nivel: "aviso",
    titulo: "{cantidad} microcontroladores",
    mensaje:
      "El montaje lleva un solo MCU. Para usar varios hay que comunicarlos entre sí (UART o I2C) y repartir el firmware: proyecto avanzado.",
  },

  /* ---------- Voltajes ---------- */
  {
    tipo: "voltaje",
    id: "logica-5v-en-placa-3v3",
    piezas: { excepto: ["placa"] },
    fuente: { tipos: ["placa"] },
    campo: "voltajeLogico",
    caso: "defecto", // la placa trabaja con MENOS voltios que la pieza
    margen: 0,
    nivel: "aviso",
    titulo: "Niveles lógicos incompatibles",
    mensaje:
      "{piezas} trabajan con lógica de {voltajePieza} V y los GPIO de la placa son de {voltajeFuente} V (no tolerantes a 5 V). Usa un adaptador de nivel lógico o una placa de 5 V.",
    sugerencia: "arduino-uno-r3",
  },
  {
    tipo: "voltaje",
    id: "logica-3v3-en-placa-5v",
    piezas: { excepto: ["placa"] },
    fuente: { tipos: ["placa"] },
    campo: "voltajeLogico",
    caso: "exceso", // la placa trabaja con MÁS voltios que la pieza
    margen: 0,
    nivel: "info",
    titulo: "Alimentar a 3,3 V",
    mensaje:
      "{piezas} funcionan a {voltajePieza} V: van al pin de 3,3 V de la placa, no al de 5 V.",
  },
  {
    tipo: "voltaje",
    id: "bateria-demasiado-fuerte",
    piezas: { tipos: ["servo", "motor-dc"] },
    fuente: { tipos: ["bateria"] },
    campo: "voltaje",
    caso: "exceso",
    margen: 0.25,
    nivel: "error",
    titulo: "Sobretensión en actuadores",
    mensaje:
      "La fuente da {voltajeFuente} V y {piezas} tienen una tensión nominal de {voltajePieza} V. Riesgo de dañar el bobinado: usa una fuente de 6 V.",
    sugerencia: "portapilas-4xaa",
  },
  {
    tipo: "voltaje",
    id: "bateria-demasiado-floja",
    piezas: { tipos: ["servo", "motor-dc"] },
    fuente: { tipos: ["bateria"] },
    campo: "voltaje",
    caso: "defecto",
    margen: 0.25,
    nivel: "aviso",
    titulo: "Subtensión en actuadores",
    mensaje:
      "La fuente da {voltajeFuente} V y {piezas} esperan {voltajePieza} V: menos par y menos velocidad que los nominales.",
  },

  /* ---------- Capacidad: pines y corriente ---------- */
  {
    tipo: "capacidad",
    id: "pines",
    etiqueta: "GPIO",
    unidad: "pines",
    campo: "pines",
    proveedor: { tipos: ["placa"] },
    combinar: "sumar",
    consumidor: { excepto: ["placa"] },
    umbrales: [
      {
        desde: 1.0001, // más del 100 %
        nivel: "error",
        titulo: "GPIO insuficientes",
        mensaje:
          "El montaje necesita {usados} GPIO y la placa ofrece {disponibles}. Quita periféricos o usa una placa con más pines (ESP32: 25).",
        sugerencia: "esp32-devkit",
      },
      {
        desde: 0.85,
        nivel: "info",
        titulo: "GPIO casi agotados",
        mensaje:
          "{usados} de {disponibles} GPIO en uso ({porcentaje} %). Poco margen para ampliar.",
      },
    ],
  },
  {
    tipo: "capacidad",
    id: "corriente",
    etiqueta: "Corriente pico",
    unidad: "mA",
    campo: "consumoMa",
    proveedor: { tipos: ["bateria"] },
    combinar: "mayor",
    consumidor: { excepto: ["bateria"] },
    umbrales: [
      {
        desde: 1.0001,
        nivel: "error",
        titulo: "Corriente de pico por encima de la fuente",
        mensaje:
          "Pico estimado de {usados} mA frente a {disponibles} mA máximos de la fuente. Caídas de tensión y reinicios del MCU (brown-out): usa una fuente de más capacidad.",
        sugerencia: "bateria-18650-2s",
      },
      {
        desde: 0.8,
        nivel: "aviso",
        titulo: "Fuente al límite",
        mensaje:
          "Pico de {usados} mA sobre {disponibles} mA disponibles ({porcentaje} %). Funciona, pero con poca autonomía y la tensión cae en los arranques.",
        sugerencia: "bateria-18650-2s",
      },
    ],
  },
];
