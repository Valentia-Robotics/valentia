/**
 * MANDO A DISTANCIA DEL COCHE (se desbloquea con el código del kit del coche)
 * Conecta por wifi o por Bluetooth con la ESP32 del coche (programa en firmware/coche-esp32).
 * Joystick para conducir, tres velocidades, modos automáticos y la distancia del sensor de ultrasonidos.
 */
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Joystick } from "@/componentes/Joystick";
import type { EstadoConexion } from "@/control/conexion";
import { bluetoothDisponible } from "@/control/conexionBluetooth";
import type { Modo } from "@/control/protocolo";
import { useMando } from "@/control/useMando";
import { useSesion } from "@/lib/sesion";
import { color, espacio, radio } from "@/lib/tema";

const OSCURO = {
  fondo: "#08090B",
  tarjeta: "#121419",
  borde: "#232731",
  texto: "#F4F4F2",
  suave: "#8A8F99",
  peligro: "#FF453A",
  ok: "#30D158",
  aviso: "#FFB020",
};

const VELOCIDADES = [
  { valor: 40, texto: "Tortuga", icono: "🐢" },
  { valor: 70, texto: "Normal", icono: "🚗" },
  { valor: 100, texto: "Turbo", icono: "⚡" },
];

const MODOS: { modo: Modo; texto: string; icono: string }[] = [
  { modo: "manual", texto: "Conduces tú", icono: "🎮" },
  { modo: "linea", texto: "Sigue la línea", icono: "〰️" },
  { modo: "obstaculos", texto: "Esquiva solo", icono: "🦇" },
];

const TEXTO_ESTADO: Record<EstadoConexion, string> = {
  desconectado: "Sin conectar",
  buscando: "Buscando el coche…",
  conectando: "Conectando…",
  conectado: "Conectado",
  error: "Sin conectar",
};

const toque = () => Haptics.selectionAsync().catch(() => {});

export default function Mando() {
  const { kit: slug } = useLocalSearchParams<{ kit: string }>();
  const { kits } = useSesion();
  const { width } = useWindowDimensions();
  const mando = useMando();

  // Solo con el kit del coche desbloqueado (el código del kit es la llave)
  const kit = kits.find((k) => k.slug === slug);
  const permitido = kit?.funciones.some(
    (f) => f.id === "control-remoto" && f.disponible,
  );

  const conectado = mando.estado === "conectado";
  const ocupado = mando.estado === "buscando" || mando.estado === "conectando";
  const tamanoJoystick = Math.min(width - espacio.xl * 2, 280);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: OSCURO.fondo }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          padding: espacio.l,
          gap: espacio.l,
          paddingBottom: espacio.xl,
        }}
      >
        {/* Cabecera: volver, logo y estado de la conexión */}
        <View style={estilos.cabecera}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={12}
            style={estilos.volver}
          >
            <Text style={{ color: OSCURO.texto, fontSize: 22 }}>‹</Text>
          </Pressable>
          <Image
            source={require("../../assets/logo-blanco.png")}
            style={{ width: 128, height: 16 }}
            contentFit="contain"
            accessibilityLabel="Valentia"
          />
          <View style={estilos.estado}>
            <View
              style={[
                estilos.punto,
                {
                  backgroundColor: conectado
                    ? OSCURO.ok
                    : ocupado
                      ? OSCURO.aviso
                      : OSCURO.suave,
                },
              ]}
            />
            <Text style={estilos.textoEstado}>
              {TEXTO_ESTADO[mando.estado]}
            </Text>
          </View>
        </View>

        {!permitido ? (
          <Text style={estilos.ayuda}>
            El mando se desbloquea con el código del kit del coche. Añádelo
            desde «Mis kits».
          </Text>
        ) : !conectado ? (
          <Conectar mando={mando} ocupado={ocupado} />
        ) : (
          <>
            {/* Distancia al obstáculo (sensor de ultrasonidos) */}
            <Distancia cm={mando.distancia} />

            {/* Modo */}
            <View style={estilos.fila}>
              {MODOS.map((m) => (
                <Pressable
                  key={m.modo}
                  onPress={() => {
                    toque();
                    mando.cambiarModo(m.modo);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mando.modo === m.modo }}
                  style={[
                    estilos.chip,
                    mando.modo === m.modo && estilos.chipActivo,
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{m.icono}</Text>
                  <Text
                    style={[
                      estilos.textoChip,
                      mando.modo === m.modo && { color: OSCURO.texto },
                    ]}
                  >
                    {m.texto}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Joystick */}
            <View style={{ alignItems: "center", gap: espacio.s }}>
              <Joystick
                tamano={tamanoJoystick}
                onMover={mando.moverJoystick}
                desactivado={mando.modo !== "manual"}
              />
              <Text style={estilos.ayuda}>
                {mando.modo === "manual"
                  ? "Arrastra el círculo azul para conducir"
                  : "El coche va solo. Pulsa «Conduces tú» para volver a llevarlo."}
              </Text>
            </View>

            {/* Velocidad */}
            <View style={estilos.fila}>
              {VELOCIDADES.map((v) => (
                <Pressable
                  key={v.valor}
                  onPress={() => {
                    toque();
                    mando.setVelocidad(v.valor);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mando.velocidad === v.valor }}
                  style={[
                    estilos.chip,
                    mando.velocidad === v.valor && estilos.chipActivo,
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{v.icono}</Text>
                  <Text
                    style={[
                      estilos.textoChip,
                      mando.velocidad === v.valor && { color: OSCURO.texto },
                    ]}
                  >
                    {v.texto}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Parar */}
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                ).catch(() => {});
                mando.parar();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                estilos.parar,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={estilos.textoParar}>PARAR</Text>
            </Pressable>

            <Pressable
              onPress={mando.desconectar}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text
                style={[estilos.ayuda, { textDecorationLine: "underline" }]}
              >
                Desconectar ({mando.via === "wifi" ? "wifi" : "Bluetooth"}
                {mando.nombre ? ` · ${mando.nombre}` : ""})
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Pantalla para elegir cómo conectar */
function Conectar({
  mando,
  ocupado,
}: {
  mando: ReturnType<typeof useMando>;
  ocupado: boolean;
}) {
  const hayBluetooth = bluetoothDisponible();
  return (
    <View style={{ gap: espacio.m }}>
      <View style={{ gap: espacio.s, marginTop: espacio.m }}>
        <Text style={estilos.titulo}>Mando del coche</Text>
        <Text style={estilos.ayuda}>
          Enciende el coche y elige cómo conectarte.
        </Text>
      </View>

      {mando.detalle ? (
        <View style={estilos.error}>
          <Text style={{ color: "#FFD3D0", fontSize: 15, lineHeight: 21 }}>
            {mando.detalle}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => mando.conectar("bluetooth")}
        disabled={ocupado}
        accessibilityRole="button"
        style={({ pressed }) => [
          estilos.opcion,
          pressed && { opacity: 0.85 },
          ocupado && { opacity: 0.5 },
        ]}
      >
        <Text style={{ fontSize: 30 }}>🔵</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={estilos.tituloOpcion}>Bluetooth</Text>
          <Text style={estilos.textoOpcion}>
            {hayBluetooth
              ? "Lo más fácil: la app busca tu coche y se conecta sola."
              : "Estará en la app de Google Play. En esta versión de prueba usa el wifi."}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => mando.conectar("wifi")}
        disabled={ocupado}
        accessibilityRole="button"
        style={({ pressed }) => [
          estilos.opcion,
          pressed && { opacity: 0.85 },
          ocupado && { opacity: 0.5 },
        ]}
      >
        <Text style={{ fontSize: 30 }}>📶</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={estilos.tituloOpcion}>Wifi</Text>
          <Text style={estilos.textoOpcion}>
            En los ajustes del móvil, conéctate a la red «Valentia-Coche-…»
            (contraseña: valentia) y pulsa aquí.
          </Text>
        </View>
      </Pressable>

      {ocupado ? (
        <Text style={[estilos.ayuda, { textAlign: "center" }]}>
          {mando.estado === "buscando" ? "Buscando tu coche…" : "Conectando…"}
        </Text>
      ) : null}
    </View>
  );
}

/** La distancia que mide el sensor, con una barra que se pone roja cuando hay algo cerca */
function Distancia({ cm }: { cm: number | null }) {
  const cerca = cm !== null && cm < 15;
  const medio = cm !== null && cm < 40;
  const tono = cerca ? OSCURO.peligro : medio ? OSCURO.aviso : OSCURO.ok;
  const lleno = cm === null ? 0 : Math.max(0.04, 1 - Math.min(cm, 100) / 100);
  return (
    <View
      style={estilos.tarjeta}
      accessibilityLabel={
        cm === null ? "Nada delante" : `Obstáculo a ${cm} centímetros`
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Text style={estilos.etiqueta}>DELANTE</Text>
        <Text
          style={[estilos.cifra, { color: cm === null ? OSCURO.suave : tono }]}
        >
          {cm === null ? "—" : `${cm} cm`}
        </Text>
      </View>
      <View style={estilos.barra}>
        <View
          style={[
            estilos.relleno,
            { width: `${lleno * 100}%`, backgroundColor: tono },
          ]}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  volver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: OSCURO.tarjeta,
    alignItems: "center",
    justifyContent: "center",
  },
  estado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: OSCURO.tarjeta,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  textoEstado: { color: OSCURO.texto, fontSize: 12, fontWeight: "600" },
  titulo: {
    color: OSCURO.texto,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  ayuda: {
    color: OSCURO.suave,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  error: {
    backgroundColor: "#2A1110",
    borderColor: "#5C1F1B",
    borderWidth: 1,
    borderRadius: radio.m,
    padding: espacio.m,
  },
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.m,
    padding: espacio.m,
    backgroundColor: OSCURO.tarjeta,
    borderColor: OSCURO.borde,
    borderWidth: 1,
    borderRadius: radio.l,
  },
  tituloOpcion: { color: OSCURO.texto, fontSize: 18, fontWeight: "700" },
  textoOpcion: { color: OSCURO.suave, fontSize: 14, lineHeight: 20 },
  tarjeta: {
    backgroundColor: OSCURO.tarjeta,
    borderColor: OSCURO.borde,
    borderWidth: 1,
    borderRadius: radio.l,
    padding: espacio.m,
    gap: espacio.s,
  },
  etiqueta: {
    color: OSCURO.suave,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  cifra: { fontSize: 32, fontWeight: "700", fontVariant: ["tabular-nums"] },
  barra: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1D2027",
    overflow: "hidden",
  },
  relleno: { height: 8, borderRadius: 4 },
  fila: { flexDirection: "row", gap: espacio.s },
  chip: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: radio.m,
    backgroundColor: OSCURO.tarjeta,
    borderWidth: 1,
    borderColor: OSCURO.borde,
  },
  chipActivo: { borderColor: color.acento, backgroundColor: "#141C3D" },
  textoChip: { color: OSCURO.suave, fontSize: 12, fontWeight: "600" },
  parar: {
    height: 60,
    borderRadius: 999,
    backgroundColor: OSCURO.peligro,
    alignItems: "center",
    justifyContent: "center",
  },
  textoParar: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
