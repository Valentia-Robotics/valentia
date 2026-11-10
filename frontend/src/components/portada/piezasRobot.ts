/**
 * Las piezas de un robot: el texto de cada una (portada, PiezasPortada) y hacia dónde se mueve al
 * despiezarse (modeloCoche.ts, el coche 3D con el que se hacen las fotos).
 * Es un archivo pequeño y sin "three", así que se puede importar sin coste.
 */

export interface PiezaRobot {
  id: "chasis" | "placa" | "motores" | "sensores" | "bateria";
  titulo: string;
  texto: string;
  /** Desplazamiento al despiezarse en la escena 3D (x, y, z) */
  direccion3d: [number, number, number];
  /** Desplazamiento al despiezarse en el dibujo SVG (x, y), en unidades del dibujo */
  direccion2d: [number, number];
}

export const PIEZAS_ROBOT: PiezaRobot[] = [
  {
    id: "chasis",
    titulo: "El chasis",
    texto: "La base sobre la que va todo lo demás. Pesa poco y aguanta bien los golpes.",
    direccion3d: [0, -0.3, 0],
    direccion2d: [0, 30],
  },
  {
    id: "placa",
    titulo: "La placa",
    texto: "Aquí va el programa que escribes tú. Lo que haga el robot depende de lo que le pongas.",
    direccion3d: [0.35, 0.95, -0.1],
    direccion2d: [0, -120],
  },
  {
    id: "motores",
    titulo: "Motores y ruedas",
    texto: "Mueven las ruedas: con ellos el coche avanza, gira y frena.",
    direccion3d: [-0.65, -0.1, 0],
    direccion2d: [-40, 80],
  },
  {
    id: "sensores",
    titulo: "Los sensores",
    texto: "Miran al suelo para seguir la línea y avisan si hay algo delante.",
    direccion3d: [1.05, 0.3, 0],
    direccion2d: [110, -20],
  },
  {
    id: "bateria",
    titulo: "La batería",
    texto:
      "Dos baterías recargables, que vienen en la caja. Con ellas el coche va solo, sin cables, durante horas.",
    direccion3d: [-0.7, 0.8, -0.4],
    direccion2d: [-110, -70],
  },
];
