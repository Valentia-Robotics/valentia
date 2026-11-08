/**
 * Dibujo de la pista del coche simulado (vista desde arriba): paredes, línea negra, cajas y el coche.
 * El rayo que sale del coche es lo que «ve» su sensor de distancia.
 */
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  CAJAS,
  type CocheSimulado,
  LINEA,
  PISTA,
  RADIO_COCHE,
} from "@/control/cocheSimulado";

const MS_DIBUJO = 33;

export function PistaSimulada({
  coche,
  ancho,
}: {
  coche: CocheSimulado;
  ancho: number;
}) {
  // Copia de lo que hay que dibujar, refrescada unas 30 veces por segundo
  const [foto, setFoto] = useState(() => leer(coche));
  useEffect(() => {
    const reloj = setInterval(() => setFoto(leer(coche)), MS_DIBUJO);
    return () => clearInterval(reloj);
  }, [coche]);

  const s = ancho / PISTA.ancho;
  const largo = 24 * s;
  const anchoCoche = 17 * s;
  const rayo = (RADIO_COCHE + (foto.cm ?? 60)) * s;
  const tonoRayo =
    foto.cm === null ? "#30D15833" : foto.cm < 15 ? "#FF453A99" : "#FFB02077";

  return (
    <View
      style={[estilos.pista, { width: ancho, height: PISTA.alto * s }]}
      accessibilityLabel="Pista del coche simulado"
    >
      {/* Línea negra del circuito */}
      <View
        style={{
          position: "absolute",
          left: (LINEA.cx - LINEA.recta - LINEA.radio) * s,
          top: (LINEA.cy - LINEA.radio) * s,
          width: (LINEA.recta + LINEA.radio) * 2 * s,
          height: LINEA.radio * 2 * s,
          borderRadius: LINEA.radio * s,
          borderWidth: Math.max(3, 4 * s),
          borderColor: "#0B0B0B",
        }}
      />
      {/* Cajas */}
      {CAJAS.map((c, i) => (
        <View
          key={i}
          style={[
            estilos.caja,
            {
              left: c.x * s,
              top: c.y * s,
              width: c.ancho * s,
              height: c.alto * s,
            },
          ]}
        />
      ))}
      {/* Rayo del sensor de distancia */}
      <View
        style={{
          position: "absolute",
          left: foto.x * s,
          top: foto.y * s - 1,
          width: rayo,
          height: 2,
          backgroundColor: tonoRayo,
          transformOrigin: "left center",
          transform: [{ rotate: `${foto.angulo}rad` }],
        }}
      />
      {/* El coche: cuerpo azul, ruedas negras y el sensor delante (a la derecha antes de girar) */}
      <View
        style={{
          position: "absolute",
          left: foto.x * s - largo / 2,
          top: foto.y * s - anchoCoche / 2,
          width: largo,
          height: anchoCoche,
          transform: [{ rotate: `${foto.angulo}rad` }],
        }}
      >
        <View
          style={[
            estilos.rueda,
            { left: largo * 0.18, top: -2, width: largo * 0.3 },
          ]}
        />
        <View
          style={[
            estilos.rueda,
            { left: largo * 0.18, bottom: -2, width: largo * 0.3 },
          ]}
        />
        <View
          style={[
            estilos.cuerpo,
            foto.chocado && { backgroundColor: "#FF453A" },
          ]}
        />
        <View style={[estilos.sensor, { height: anchoCoche * 0.7 }]} />
      </View>
    </View>
  );
}

function leer(coche: CocheSimulado) {
  return {
    x: coche.x,
    y: coche.y,
    angulo: coche.angulo,
    chocado: coche.chocado,
    cm: coche.distancia(),
  };
}

const estilos = StyleSheet.create({
  pista: {
    backgroundColor: "#E9E9E4",
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#3A3F4B",
    overflow: "hidden",
    alignSelf: "center",
  },
  caja: {
    position: "absolute",
    backgroundColor: "#B07A45",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#7A5230",
  },
  rueda: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
    backgroundColor: "#111",
  },
  cuerpo: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 2,
    bottom: 2,
    borderRadius: 4,
    backgroundColor: "#2D4BFF",
  },
  sensor: {
    position: "absolute",
    right: -2,
    alignSelf: "center",
    top: "15%",
    width: 4,
    borderRadius: 2,
    backgroundColor: "#7A8CFF",
  },
});
