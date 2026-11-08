/**
 * BLUETOOTH (de bajo consumo): la app busca un coche llamado «Valentia-Coche-…» y se conecta sola.
 * Usa react-native-ble-plx, que NO viene en Expo Go: hace falta la app compilada (`eas build`).
 * En Expo Go, `bluetoothDisponible()` devuelve false y el mando ofrece solo el wifi.
 */
import Constants, { ExecutionEnvironment } from "expo-constants";
import { PermissionsAndroid, Platform } from "react-native";
import type {
  BleManager as TipoBleManager,
  Device,
  Subscription,
} from "react-native-ble-plx";
import type { Avisos, Conexion } from "./conexion";
import { BLE, leerMensaje, partirLineas } from "./protocolo";

/** Segundos buscando el coche antes de rendirse */
const SEGUNDOS_BUSCANDO = 12;

let gestor: TipoBleManager | null = null;

/** El gestor de Bluetooth, o null si esta versión de la app no lo trae (Expo Go) */
function obtenerGestor(): TipoBleManager | null {
  if (gestor) return gestor;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return null;
  try {
    // Se carga aquí y no arriba: en Expo Go este módulo no existe y rompería la app al abrirla
    const { BleManager } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("react-native-ble-plx") as typeof import("react-native-ble-plx");
    gestor = new BleManager();
    return gestor;
  } catch {
    return null;
  }
}

export function bluetoothDisponible(): boolean {
  return obtenerGestor() !== null;
}

/** Android 12 o más nuevo pide permiso para buscar y conectar; los anteriores, el de ubicación */
async function pedirPermisos(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  if (Platform.Version >= 31) {
    const r = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(r).every(
      (v) => v === PermissionsAndroid.RESULTS.GRANTED,
    );
  }
  const r = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

// Texto ↔ base64 (la librería envía y recibe los datos en base64). Los mensajes solo llevan ASCII.
const aBase64 = (texto: string) => btoa(texto);
const deBase64 = (b64: string) => atob(b64);

export function conectarBluetooth(avisos: Avisos): Conexion {
  const ble = obtenerGestor();
  let cerrada = false;
  let dispositivo: Device | null = null;
  let suscripciones: Subscription[] = [];
  let pendiente = "";
  let limite: ReturnType<typeof setTimeout> | undefined;

  const terminar = (estado: "desconectado" | "error", detalle?: string) => {
    clearTimeout(limite);
    ble?.stopDeviceScan().catch(() => {});
    suscripciones.forEach((s) => s.remove());
    suscripciones = [];
    if (dispositivo)
      ble?.cancelDeviceConnection(dispositivo.id).catch(() => {});
    dispositivo = null;
    avisos.alCambiarEstado(estado, detalle);
  };

  (async () => {
    if (!ble) {
      avisos.alCambiarEstado(
        "error",
        "El Bluetooth necesita la app completa (en Expo Go no está). De momento usa el wifi.",
      );
      return;
    }
    if (!(await pedirPermisos())) {
      avisos.alCambiarEstado(
        "error",
        "Sin permiso de Bluetooth no podemos buscar el coche.",
      );
      return;
    }
    const estado = await ble.state();
    if (estado === "PoweredOff") {
      avisos.alCambiarEstado(
        "error",
        "Activa el Bluetooth del móvil y vuelve a probar.",
      );
      return;
    }

    avisos.alCambiarEstado("buscando");
    limite = setTimeout(
      () =>
        terminar("error", "No encontramos el coche. ¿Está encendido y cerca?"),
      SEGUNDOS_BUSCANDO * 1000,
    );

    ble.startDeviceScan([BLE.servicio], null, async (error, encontrado) => {
      if (cerrada) return;
      if (error) {
        terminar("error", "No se ha podido buscar por Bluetooth.");
        return;
      }
      const nombre = encontrado?.localName ?? encontrado?.name ?? "";
      if (!encontrado || !nombre.startsWith(BLE.prefijoNombre)) return;

      clearTimeout(limite);
      await ble.stopDeviceScan().catch(() => {});
      avisos.alCambiarEstado("conectando", nombre);
      try {
        let d = await ble.connectToDevice(encontrado.id, { timeout: 8000 });
        if (Platform.OS === "android")
          d = await d.requestMTU(185).catch(() => d);
        d = await d.discoverAllServicesAndCharacteristics();
        if (cerrada) {
          await d.cancelConnection().catch(() => {});
          return;
        }
        dispositivo = d;
        suscripciones.push(
          d.monitorCharacteristicForService(
            BLE.servicio,
            BLE.tx,
            (err, caracteristica) => {
              if (err || !caracteristica?.value) return;
              const { lineas, resto } = partirLineas(
                pendiente,
                deBase64(caracteristica.value),
              );
              pendiente = resto;
              for (const linea of lineas) {
                const mensaje = leerMensaje(linea);
                if (mensaje) avisos.alRecibir(mensaje);
              }
            },
          ),
          ble.onDeviceDisconnected(d.id, () => {
            if (!cerrada)
              terminar(
                "desconectado",
                "Se ha perdido la conexión con el coche.",
              );
          }),
        );
        avisos.alCambiarEstado("conectado", nombre);
      } catch {
        terminar(
          "error",
          "No se ha podido conectar con el coche. Apágalo, enciéndelo y prueba otra vez.",
        );
      }
    });
  })();

  return {
    via: "bluetooth",
    enviar: (linea) => {
      if (!dispositivo) return;
      dispositivo
        .writeCharacteristicWithoutResponseForService(
          BLE.servicio,
          BLE.rx,
          aBase64(`${linea}\n`),
        )
        .catch(() => {});
    },
    cerrar: () => {
      cerrada = true;
      terminar("desconectado");
    },
  };
}
