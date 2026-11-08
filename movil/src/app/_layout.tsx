/**
 * Marco de toda la app: la sesión y la navegación entre pantallas.
 */
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProveedorSesion } from "@/lib/sesion";
import { color } from "@/lib/tema";

export default function Marco() {
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: color.tinta,
            headerStyle: { backgroundColor: color.niebla },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: "minimal",
            contentStyle: { backgroundColor: color.niebla },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="entrar" options={{ headerShown: false }} />
          <Stack.Screen name="codigo" options={{ title: "" }} />
          <Stack.Screen name="kits/index" options={{ headerShown: false }} />
          <Stack.Screen name="kits/[slug]" options={{ title: "" }} />
          <Stack.Screen name="mando" options={{ headerShown: false }} />
          <Stack.Screen
            name="activar"
            options={{ title: "Añadir un kit", presentation: "modal" }}
          />
        </Stack>
      </ProveedorSesion>
    </SafeAreaProvider>
  );
}
