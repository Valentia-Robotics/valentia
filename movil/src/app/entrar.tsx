/**
 * ENTRAR: la misma cuenta que en la web. Después llega un código al email (pantalla /codigo).
 * Crear la cuenta se hace en la web (se abre en el navegador del móvil).
 */
import { Image } from "expo-image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Aviso, Boton, Campo, Titulo } from "@/componentes/ui";
import { api, ErrorApi, WEB } from "@/lib/api";
import { color, espacio } from "@/lib/tema";

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    setError(null);
    if (!email.trim() || !contrasena) {
      setError("Escribe tu email y tu contraseña.");
      return;
    }
    setCargando(true);
    try {
      const r = await api.entrar(email.trim().toLowerCase(), contrasena);
      router.push({
        pathname: "/codigo",
        params: { verificacion: r.verificacion, email: r.email },
      });
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? e.message
          : "Algo ha fallado. Inténtalo de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: espacio.l, paddingTop: espacio.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 150, height: 32, marginBottom: espacio.xl }}
            contentFit="contain"
            accessibilityLabel="Valentia"
          />
          <Titulo sub="Entra con la misma cuenta que usas en la web para ver tus kits y desbloquear los nuevos.">
            Hola de nuevo
          </Titulo>
          <Aviso>{error}</Aviso>
          <Campo
            etiqueta="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="tu@email.com"
            returnKeyType="next"
          />
          <Campo
            etiqueta="Contraseña"
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={enviar}
          />
          <View style={{ gap: espacio.s, marginTop: espacio.s }}>
            <Boton onPress={enviar} cargando={cargando}>
              Entrar
            </Boton>
            <Boton
              variante="texto"
              onPress={() => WebBrowser.openBrowserAsync(`${WEB}/recuperar`)}
            >
              ¿Has olvidado la contraseña?
            </Boton>
          </View>
          <View
            style={{
              marginTop: espacio.xl,
              alignItems: "center",
              gap: espacio.s,
            }}
          >
            <Text style={{ color: color.gris, fontSize: 15 }}>
              ¿Todavía no tienes cuenta?
            </Text>
            <Boton
              variante="secundario"
              onPress={() => WebBrowser.openBrowserAsync(`${WEB}/registro`)}
            >
              Crear cuenta en la web
            </Boton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
