/**
 * Tarjeta de un kit en «Mis kits»: foto, nombre y progreso del curso.
 */
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { KitUsuario } from "@/lib/api";
import { color, espacio, radio } from "@/lib/tema";

export function TarjetaKit({
  kit,
  onPress,
}: {
  kit: KitUsuario;
  onPress: () => void;
}) {
  const { lecciones, completadas } = kit.curso;
  const porcentaje = lecciones
    ? Math.round((completadas / lecciones) * 100)
    : 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kit.nombre}. Curso al ${porcentaje} %`}
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && { opacity: 0.85 }]}
    >
      <Image
        source={kit.foto}
        style={estilos.foto}
        contentFit="cover"
        transition={200}
      />
      <View style={{ padding: espacio.m, gap: espacio.xs }}>
        <Text style={estilos.nombre}>{kit.nombre}</Text>
        <Text style={estilos.texto}>
          {lecciones
            ? `Curso: ${completadas} de ${lecciones} lecciones`
            : kit.curso.titulo}
        </Text>
        <View style={estilos.barra}>
          <View style={[estilos.relleno, { width: `${porcentaje}%` }]} />
        </View>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: color.blanco,
    borderRadius: radio.l,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: color.linea,
  },
  // La foto entera dentro del marco (contain): el coche es más ancho que alto y con «cover» se cortaba
  marcoFoto: {
    width: "100%",
    aspectRatio: 1.9,
    backgroundColor: color.niebla,
    padding: espacio.m,
  },
  foto: { flex: 1 },
  nombre: { fontSize: 19, fontWeight: "700", color: color.tinta },
  texto: { fontSize: 14, color: color.gris },
  barra: {
    height: 6,
    borderRadius: 3,
    backgroundColor: color.niebla,
    marginTop: espacio.s,
    overflow: "hidden",
  },
  relleno: { height: 6, backgroundColor: color.acento },
});
