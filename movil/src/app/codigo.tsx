/**
 * CÓDIGO DEL EMAIL: cada móvil nuevo confirma que eres tú (como un navegador nuevo en la web).
 */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Aviso, Boton, Titulo } from "@/componentes/ui";
import { api, ErrorApi } from "@/lib/api";
import { useSesion } from "@/lib/sesion";
import { color, espacio, radio } from "@/lib/tema";

export default function Codigo() {
  const { verificacion, email } = useLocalSearchParams<{
    verificacion: string;
    email: string;
  }>();
  const { entrar } = useSesion();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(60);

  // Cuenta atrás para poder pedir otro código
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function confirmar(valor = codigo) {
    if (valor.length !== 6 || cargando) return;
    setError(null);
    setCargando(true);
    try {
      const r = await api.verificar(verificacion, valor);
      await entrar(r.token, r.usuario);
      router.replace("/kits");
    } catch (e) {
      setCodigo("");
      if (e instanceof ErrorApi && e.datos.tipo === "reiniciar") {
        setError(`${e.message}`);
        setTimeout(() => router.replace("/entrar"), 1800);
      } else {
        setError(
          e instanceof ErrorApi
            ? e.message
            : "Algo ha fallado. Inténtalo de nuevo.",
        );
      }
    } finally {
      setCargando(false);
    }
  }

  async function reenviar() {
    setError(null);
    setAviso(null);
    try {
      const r = await api.reenviar(verificacion);
      setEspera(r.espera);
      setAviso("Te hemos enviado un código nuevo.");
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se ha podido enviar.");
      if (e instanceof ErrorApi && typeof e.datos.espera === "number")
        setEspera(e.datos.espera);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: espacio.l }}
        keyboardShouldPersistTaps="handled"
      >
        <Titulo
          sub={`Te hemos enviado un código de 6 cifras a ${email}. Escríbelo aquí.`}
        >
          Revisa tu email
        </Titulo>
        <Aviso>{error}</Aviso>
        <Aviso tipo="exito">{aviso}</Aviso>
        <TextInput
          value={codigo}
          onChangeText={(texto) => {
            const limpio = texto.replace(/\D/g, "").slice(0, 6);
            setCodigo(limpio);
            if (limpio.length === 6) confirmar(limpio);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          accessibilityLabel="Código de 6 cifras"
          placeholder="000000"
          placeholderTextColor={color.linea}
          style={{
            fontSize: 34,
            letterSpacing: 12,
            textAlign: "center",
            fontWeight: "600",
            paddingVertical: espacio.m,
            borderWidth: 1,
            borderColor: color.linea,
            borderRadius: radio.m,
            backgroundColor: color.blanco,
            color: color.tinta,
            marginBottom: espacio.l,
          }}
        />
        <View style={{ gap: espacio.s }}>
          <Boton
            onPress={() => confirmar()}
            cargando={cargando}
            desactivado={codigo.length !== 6}
          >
            Confirmar
          </Boton>
          <Boton variante="texto" onPress={reenviar} desactivado={espera > 0}>
            {espera > 0
              ? `Pedir otro código en ${espera} s`
              : "Pedir otro código"}
          </Boton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
