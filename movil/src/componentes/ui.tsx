/**
 * Piezas pequeñas que se repiten en todas las pantallas: botón, campo de texto, aviso y título.
 */
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";
import { color, espacio, radio } from "@/lib/tema";

export function Titulo({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <View style={{ gap: espacio.s, marginBottom: espacio.l }}>
      <Text style={estilos.titulo}>{children}</Text>
      {sub ? <Text style={estilos.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Boton({
  children,
  onPress,
  cargando,
  variante = "principal",
  desactivado,
}: {
  children: string;
  onPress: () => void;
  cargando?: boolean;
  variante?: "principal" | "secundario" | "texto";
  desactivado?: boolean;
}) {
  const inactivo = desactivado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        variante === "principal" && {
          backgroundColor: pressed ? color.acentoHover : color.acento,
        },
        variante === "secundario" && estilos.secundario,
        variante === "texto" && estilos.botonTexto,
        inactivo && { opacity: 0.55 },
        pressed && variante !== "principal" && { opacity: 0.7 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator
          color={variante === "principal" ? color.blanco : color.tinta}
        />
      ) : (
        <Text
          style={[
            estilos.textoBoton,
            variante === "principal"
              ? { color: color.blanco }
              : { color: color.tinta },
            variante === "texto" && { color: color.acento },
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Campo({
  etiqueta,
  ...props
}: TextInputProps & { etiqueta: string }) {
  return (
    <View style={{ gap: espacio.xs, marginBottom: espacio.m }}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={color.grisClaro}
        style={estilos.campo}
        accessibilityLabel={etiqueta}
        {...props}
      />
    </View>
  );
}

export function Aviso({
  children,
  tipo = "error",
}: {
  children?: string | null;
  tipo?: "error" | "exito";
}) {
  if (!children) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        estilos.aviso,
        tipo === "exito" && {
          backgroundColor: "#E7F5EC",
          borderColor: color.exito,
        },
      ]}
    >
      <Text
        style={{
          color: tipo === "exito" ? color.exito : "#9B1C13",
          fontSize: 15,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: {
    fontSize: 30,
    fontWeight: "700",
    color: color.tinta,
    letterSpacing: -0.5,
  },
  sub: { fontSize: 16, color: color.gris, lineHeight: 22 },
  boton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacio.l,
  },
  secundario: {
    borderWidth: 1,
    borderColor: color.linea,
    backgroundColor: color.blanco,
  },
  botonTexto: { minHeight: 44 },
  textoBoton: { fontSize: 16, fontWeight: "600" },
  etiqueta: { fontSize: 14, fontWeight: "600", color: color.grafito },
  campo: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: color.linea,
    borderRadius: radio.s,
    paddingHorizontal: espacio.m,
    fontSize: 17,
    color: color.tinta,
    backgroundColor: color.blanco,
  },
  aviso: {
    borderWidth: 1,
    borderColor: color.error,
    backgroundColor: color.errorFondo,
    borderRadius: radio.s,
    padding: espacio.m,
    marginBottom: espacio.m,
  },
});
