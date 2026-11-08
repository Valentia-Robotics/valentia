/**
 * JOYSTICK: un círculo con un botón que se arrastra con el dedo. Al soltarlo vuelve al centro.
 * Devuelve x (derecha +) e y (adelante +), de -1 a 1.
 */
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { color } from "@/lib/tema";

export function Joystick({
  tamano = 240,
  onMover,
  desactivado,
}: {
  tamano?: number;
  onMover: (x: number, y: number) => void;
  desactivado?: boolean;
}) {
  const radio = tamano / 2;
  const boton = tamano * 0.38;
  const maximo = radio - boton / 2;
  const [posicion] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  // Lo que cambia entre dibujos se guarda en refs: el PanResponder se crea una sola vez
  const onMoverRef = useRef(onMover);
  const desactivadoRef = useRef(desactivado);
  const maximoRef = useRef(maximo);
  useEffect(() => {
    onMoverRef.current = onMover;
    desactivadoRef.current = desactivado;
    maximoRef.current = maximo;
  }, [onMover, desactivado, maximo]);

  // Las refs solo se leen dentro de los gestos (al tocar), no al dibujar: el aviso de la regla no aplica
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const soltar = () => {
      onMoverRef.current(0, 0);
      Animated.spring(posicion, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 6,
      }).start();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !desactivadoRef.current,
      onMoveShouldSetPanResponder: () => !desactivadoRef.current,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      },
      onPanResponderMove: (_e, g) => {
        let dx = g.dx;
        let dy = g.dy;
        const largo = Math.hypot(dx, dy);
        const tope = maximoRef.current;
        if (largo > tope) {
          dx = (dx / largo) * tope;
          dy = (dy / largo) * tope;
        }
        posicion.setValue({ x: dx, y: dy });
        // En pantalla «abajo» es y positiva; para el coche, adelante es positivo
        onMoverRef.current(dx / tope, -dy / tope);
      },
      onPanResponderRelease: soltar,
      onPanResponderTerminate: soltar,
    });
  });

  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel="Joystick: arrastra para mover el coche"
      style={[
        estilos.base,
        {
          width: tamano,
          height: tamano,
          borderRadius: radio,
          opacity: desactivado ? 0.4 : 1,
        },
      ]}
    >
      {/* Guías en cruz */}
      <View style={[estilos.guia, { width: tamano * 0.7, height: 2 }]} />
      <View style={[estilos.guia, { width: 2, height: tamano * 0.7 }]} />
      <View
        style={[
          estilos.anillo,
          { width: tamano * 0.62, height: tamano * 0.62, borderRadius: tamano },
        ]}
      />
      <Animated.View
        style={[
          estilos.boton,
          {
            width: boton,
            height: boton,
            borderRadius: boton / 2,
            transform: posicion.getTranslateTransform(),
          },
        ]}
      >
        <View
          style={[
            estilos.brillo,
            { width: boton * 0.45, height: boton * 0.45, borderRadius: boton },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    backgroundColor: "#15171C",
    borderWidth: 2,
    borderColor: "#262A33",
    alignItems: "center",
    justifyContent: "center",
  },
  guia: { position: "absolute", backgroundColor: "#22262E" },
  anillo: { position: "absolute", borderWidth: 1, borderColor: "#2B3140" },
  boton: {
    backgroundColor: color.acento,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: color.acento,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  brillo: { backgroundColor: "rgba(255,255,255,0.18)" },
});
