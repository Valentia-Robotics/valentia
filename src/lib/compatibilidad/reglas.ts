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
    titulo: "Falta el cerebro",
    mensaje:
      "Tu robot necesita una placa (Arduino o ESP32) que dé las órdenes a {piezas}. Sin ella, nada se moverá.",
    sugerencia: "arduino-uno-r3",
    requisito: "Una placa que le dé órdenes (Arduino o ESP32)",
  },
  {
    tipo: "necesita",
    id: "motor-necesita-driver",
    si: { tipos: ["motor-dc"] },
    necesita: { tipos: ["driver-motores"] },
    unoPorCada: 2,
    nivel: "error",
    titulo: "Los motores necesitan un driver",
    mensaje:
      "La placa no tiene fuerza para mover motores directamente. Cada driver controla 2 motores: con {cantidad} motores necesitas {necesarias} y tienes {tienes}.",
    sugerencia: "driver-motores-l298n",
    requisito: "Un driver de motores (cada driver mueve 2 motores)",
  },
  {
    tipo: "necesita",
    id: "motores-necesitan-bateria",
    si: { tipos: ["motor-dc", "servo"] },
    necesita: { tipos: ["bateria"] },
    nivel: "error",
    titulo: "Faltan las pilas",
    mensaje:
      "Los motores gastan mucha energía y el cable USB del ordenador no basta para moverlos. Añade un portapilas o una batería.",
    sugerencia: "portapilas-4xaa",
    requisito: "Pilas o batería: el USB no tiene fuerza suficiente",
  },
  {
    tipo: "necesita",
    id: "motores-necesitan-chasis",
    si: { tipos: ["motor-dc"] },
    necesita: { tipos: ["chasis-coche"] },
    nivel: "info",
    titulo: "¿Dónde vas a montar los motores?",
    mensaje:
      "Un chasis te da la base, las ruedas y los agujeros para atornillar los motores sin complicarte.",
    sugerencia: "chasis-coche-2wd",
  },
  {
    tipo: "necesita",
    id: "placa-sin-bateria",
    si: { tipos: ["placa"] },
    necesita: { tipos: ["bateria"] },
    nivel: "info",
    titulo: "Funcionará conectado al ordenador",
    mensaje:
      "Sin pilas, tu robot se alimenta por el cable USB. Perfecto para aprender en la mesa; si quieres que sea autónomo, añade un portapilas.",
    sugerencia: "portapilas-4xaa",
  },

  /* ---------- Límites ---------- */
  {
    tipo: "maximo",
    id: "una-sola-placa",
    si: { tipos: ["placa"] },
    maximo: 1,
    nivel: "aviso",
    titulo: "Tu robot tiene {cantidad} placas",
    mensaje:
      "Normalmente un robot lleva un solo cerebro. Si de verdad quieres usar varias, tendrás que conectarlas entre sí (es un proyecto avanzado).",
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
    titulo: "Cuidado con los voltios de las señales",
    mensaje:
      "Estas piezas usan señales de {voltajePieza} V: {piezas}. Los pines de tu placa son de {voltajeFuente} V y podrían dañarse: usa un adaptador de nivel lógico o una placa Arduino.",
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
    titulo: "Usa el pin de 3,3 V de la placa",
    mensaje:
      "Estas piezas funcionan a {voltajePieza} V: {piezas}. Conéctalas al pin de 3,3 V de la placa, no al de 5 V.",
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
    titulo: "Demasiados voltios",
    mensaje:
      "La batería da {voltajeFuente} V y estas piezas aguantan unos {voltajePieza} V: {piezas}. Podrían quemarse: usa un portapilas de 6 V.",
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
    titulo: "Pocos voltios",
    mensaje:
      "La batería da {voltajeFuente} V y estas piezas necesitan unos {voltajePieza} V: {piezas}. Funcionarán, pero lentas y con poca fuerza.",
  },

  /* ---------- Capacidad: pines y corriente ---------- */
  {
    tipo: "capacidad",
    id: "pines",
    etiqueta: "Pines de la placa",
    unidad: "pines",
    campo: "pines",
    proveedor: { tipos: ["placa"] },
    combinar: "sumar",
    consumidor: { excepto: ["placa"] },
    umbrales: [
      {
        desde: 1.0001, // más del 100 %
        nivel: "error",
        titulo: "No caben tantos cables en la placa",
        mensaje:
          "Tus piezas necesitan {usados} pines y solo hay {disponibles}. Quita alguna pieza o elige una placa con más pines, como la ESP32.",
        sugerencia: "esp32-devkit",
      },
      {
        desde: 0.85,
        nivel: "info",
        titulo: "La placa está casi llena",
        mensaje:
          "Usas {usados} de {disponibles} pines ({porcentaje} %). Te queda poco sitio para ampliar.",
      },
    ],
  },
  {
    tipo: "capacidad",
    id: "corriente",
    etiqueta: "Energía de la batería",
    unidad: "mA",
    campo: "consumoMa",
    proveedor: { tipos: ["bateria"] },
    combinar: "mayor",
    consumidor: { excepto: ["bateria"] },
    umbrales: [
      {
        desde: 1.0001,
        nivel: "error",
        titulo: "La batería se queda corta",
        mensaje:
          "Tu robot puede llegar a gastar {usados} mA y la batería da como mucho {disponibles} mA. Se reiniciará o los motores irán a tirones: usa una batería más potente.",
        sugerencia: "bateria-18650-2s",
      },
      {
        desde: 0.8,
        nivel: "aviso",
        titulo: "La batería va justa",
        mensaje:
          "Tu robot gasta {usados} de {disponibles} mA ({porcentaje} %). Funcionará, pero las pilas durarán poco.",
        sugerencia: "bateria-18650-2s",
      },
    ],
  },
];
