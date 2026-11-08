/**
 * AÑADIR UN KIT: escanear el QR de la tarjeta de la caja o escribir su código (VAL-XXXX-XXXX).
 * Es el mismo código que en la web: si ya lo activaste allí, el kit ya sale en «Mis kits».
 */
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Aviso, Boton, Campo } from "@/componentes/ui";
import { ErrorApi } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import { color, espacio, radio } from "@/lib/tema";

type Modo = "escanear" | "escribir";

export default function Activar() {
  const { activar } = useSesion();
  const [modo, setModo] = useState<Modo>("escanear");
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  // La cámara lee el mismo QR muchas veces por segundo: solo hacemos caso a la primera
  const leyendo = useRef(false);

  async function probar(texto: string) {
    if (leyendo.current) return;
    leyendo.current = true;
    setError(null);
    setCargando(true);
    try {
      const r = await activar(texto);
      router.dismissAll();
      if (r.kit)
        router.push({ pathname: "/kits/[slug]", params: { slug: r.kit } });
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? e.message
          : "No se ha podido activar el código.",
      );
      // Dejamos un momento antes de volver a leer, para que se pueda leer el aviso
      setTimeout(() => (leyendo.current = false), 2500);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: espacio.l, gap: espacio.m }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.selector} accessibilityRole="tablist">
          {(["escanear", "escribir"] as Modo[]).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: modo === m }}
              onPress={() => {
                setModo(m);
                setError(null);
              }}
              style={[estilos.opcion, modo === m && estilos.opcionActiva]}
            >
              <Text
                style={[
                  estilos.textoOpcion,
                  modo === m && { color: color.tinta },
                ]}
              >
                {m === "escanear" ? "Escanear QR" : "Escribir código"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Aviso>{error}</Aviso>

        {modo === "escanear" ? (
          !permiso ? null : !permiso.granted ? (
            <View style={{ gap: espacio.m }}>
              <Text style={estilos.texto}>
                Para leer el QR de la tarjeta necesitamos usar la cámara. Solo
                se usa en esta pantalla.
              </Text>
              {permiso.canAskAgain ? (
                <Boton onPress={pedirPermiso}>Permitir la cámara</Boton>
              ) : (
                <Text style={estilos.texto}>
                  Has dicho que no a la cámara. Puedes activarla en los ajustes
                  del móvil, o escribir el código.
                </Text>
              )}
            </View>
          ) : (
            <View style={{ gap: espacio.m }}>
              <View style={estilos.camara}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={
                    cargando ? undefined : ({ data }) => probar(data)
                  }
                />
                <View style={estilos.marco} pointerEvents="none" />
              </View>
              <Text style={estilos.texto}>
                {cargando
                  ? "Comprobando el código…"
                  : "Apunta al QR de la tarjeta que viene en la caja."}
              </Text>
            </View>
          )
        ) : (
          <View>
            <Text style={[estilos.texto, { marginBottom: espacio.m }]}>
              Lo tienes en la tarjeta, debajo del QR. Tiene esta forma:
              VAL-XXXX-XXXX.
            </Text>
            <Campo
              etiqueta="Código del kit"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="VAL-XXXX-XXXX"
              returnKeyType="go"
              onSubmitEditing={() => probar(codigo)}
            />
            <Boton
              onPress={() => {
                leyendo.current = false;
                probar(codigo);
              }}
              cargando={cargando}
              desactivado={codigo.trim().length < 8}
            >
              Desbloquear kit
            </Boton>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  selector: {
    flexDirection: "row",
    backgroundColor: color.linea,
    borderRadius: 999,
    padding: 4,
  },
  opcion: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  opcionActiva: { backgroundColor: color.blanco },
  textoOpcion: { fontSize: 15, fontWeight: "600", color: color.gris },
  texto: {
    fontSize: 15,
    color: color.gris,
    lineHeight: 21,
    textAlign: "center",
  },
  camara: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radio.l,
    overflow: "hidden",
    backgroundColor: color.tinta,
    alignItems: "center",
    justifyContent: "center",
  },
  marco: {
    width: "62%",
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: color.blanco,
    borderRadius: radio.l,
  },
});
