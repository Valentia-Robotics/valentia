/**
 * UN KIT: lo que desbloquea (control remoto, datos de la estación…) y su curso.
 * Las funciones que aún no están hechas salen como «Muy pronto».
 */
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { FuncionKit } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import { color, espacio, radio } from "@/lib/tema";

const ICONOS: Record<string, string> = {
  "control-remoto": "🎮",
  "mover-brazo": "🦾",
  "datos-tiempo": "🌤️",
  curso: "🎓",
};

export default function Kit() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { kits } = useSesion();
  const kit = kits.find((k) => k.slug === slug);

  if (!kit) {
    return (
      <View style={{ padding: espacio.l }}>
        <Text style={{ fontSize: 17, color: color.gris }}>
          Este kit no está en tu cuenta.
        </Text>
      </View>
    );
  }

  function abrir(funcion: FuncionKit) {
    if (!kit || !funcion.disponible) return;
    if (funcion.id === "curso") WebBrowser.openBrowserAsync(kit.curso.url);
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: espacio.xl }}>
      <Stack.Screen options={{ title: kit.nombre }} />
      <Image
        source={kit.foto}
        style={{ width: "100%", aspectRatio: 1.6 }}
        contentFit="cover"
      />
      <View style={{ padding: espacio.l, gap: espacio.m }}>
        <View style={{ gap: espacio.xs }}>
          <Text style={estilos.nombre}>{kit.nombre}</Text>
          {kit.eslogan ? (
            <Text style={estilos.eslogan}>{kit.eslogan}</Text>
          ) : null}
        </View>
        {kit.funciones.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => abrir(f)}
            disabled={!f.disponible}
            accessibilityRole="button"
            accessibilityState={{ disabled: !f.disponible }}
            style={({ pressed }) => [
              estilos.funcion,
              pressed && { opacity: 0.8 },
              !f.disponible && { opacity: 0.75 },
            ]}
          >
            <Text style={{ fontSize: 30 }}>{ICONOS[f.id] ?? "✨"}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: espacio.s,
                  flexWrap: "wrap",
                }}
              >
                <Text style={estilos.tituloFuncion}>{f.titulo}</Text>
                {!f.disponible ? (
                  <Text style={estilos.pronto}>Muy pronto</Text>
                ) : null}
              </View>
              <Text style={estilos.descripcion}>
                {f.id === "curso" && kit.curso.lecciones
                  ? `${kit.curso.completadas} de ${kit.curso.lecciones} lecciones hechas. ${f.descripcion}`
                  : f.descripcion}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  nombre: { fontSize: 26, fontWeight: "700", color: color.tinta },
  eslogan: { fontSize: 16, color: color.gris, lineHeight: 22 },
  funcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.m,
    padding: espacio.m,
    backgroundColor: color.blanco,
    borderRadius: radio.m,
    borderWidth: 1,
    borderColor: color.linea,
  },
  tituloFuncion: { fontSize: 17, fontWeight: "600", color: color.tinta },
  descripcion: { fontSize: 14, color: color.gris, lineHeight: 20 },
  pronto: {
    fontSize: 12,
    fontWeight: "600",
    color: color.acento,
    backgroundColor: "#E9EDFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
});
