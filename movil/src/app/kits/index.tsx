/**
 * MIS KITS: los kits que has desbloqueado con su código (en la app o en la web).
 */
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TarjetaKit } from "@/componentes/TarjetaKit";
import { Aviso, Boton } from "@/componentes/ui";
import { ErrorApi } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import { color, espacio } from "@/lib/tema";

export default function MisKits() {
  const { usuario, kits, actualizar, salir, token } = useSesion();
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    setRecargando(true);
    setError(null);
    try {
      await actualizar();
    } catch (e) {
      setError(
        e instanceof ErrorApi ? e.message : "No se han podido cargar tus kits.",
      );
    } finally {
      setRecargando(false);
    }
  }

  function preguntarSalir() {
    Alert.alert("Cerrar sesión", "¿Quieres salir de tu cuenta en este móvil?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await salir();
          router.replace("/entrar");
        },
      },
    ]);
  }

  // Si la sesión se cerró (por ejemplo, desde «Mis dispositivos» en la web), volvemos a entrar
  if (!token) {
    router.replace("/entrar");
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <FlatList
        data={kits}
        keyExtractor={(k) => k.slug}
        contentContainerStyle={{
          padding: espacio.l,
          gap: espacio.m,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl
            refreshing={recargando}
            onRefresh={recargar}
            tintColor={color.acento}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: espacio.s }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Image
                source={require("../../../assets/logo.png")}
                style={{ width: 120, height: 26 }}
                contentFit="contain"
                accessibilityLabel="Valentia"
              />
              <Pressable
                onPress={preguntarSalir}
                accessibilityRole="button"
                hitSlop={12}
              >
                <Text style={{ color: color.gris, fontSize: 15 }}>Salir</Text>
              </Pressable>
            </View>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "700",
                color: color.tinta,
                marginTop: espacio.l,
              }}
            >
              {usuario ? `Hola, ${usuario.nombre.split(" ")[0]}` : "Mis kits"}
            </Text>
            <Text
              style={{ fontSize: 16, color: color.gris, marginTop: espacio.xs }}
            >
              {kits.length
                ? "Estos son tus kits. Toca uno para ver lo que puedes hacer."
                : ""}
            </Text>
            <View style={{ marginTop: espacio.m }}>
              <Aviso>{error}</Aviso>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              paddingVertical: espacio.xl,
              gap: espacio.s,
            }}
          >
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text
              style={{
                fontSize: 19,
                fontWeight: "600",
                color: color.tinta,
                textAlign: "center",
              }}
            >
              Aún no tienes ningún kit
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: color.gris,
                textAlign: "center",
                lineHeight: 21,
              }}
            >
              Escanea el QR de la tarjeta que viene en la caja de tu kit, o
              escribe su código.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TarjetaKit
            kit={item}
            onPress={() => router.push(`/kits/${item.slug}`)}
          />
        )}
      />
      <View
        style={{
          position: "absolute",
          left: espacio.l,
          right: espacio.l,
          bottom: espacio.xl,
        }}
      >
        <Boton onPress={() => router.push("/activar")}>Añadir un kit</Boton>
      </View>
    </SafeAreaView>
  );
}
