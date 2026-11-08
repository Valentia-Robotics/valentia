/**
 * Pantalla de arranque: con sesión, a «Mis kits»; sin sesión, a entrar.
 */
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSesion } from "@/lib/sesion";
import { color } from "@/lib/tema";

export default function Inicio() {
  const { cargando, token } = useSesion();
  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={color.acento} size="large" />
      </View>
    );
  }
  return <Redirect href={token ? "/kits" : "/entrar"} />;
}
