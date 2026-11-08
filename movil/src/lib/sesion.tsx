/**
 * SESIÓN DE LA APP
 * El token que da la web al confirmar el código se guarda en el almacén seguro del móvil
 * (Keychain en iPhone, Keystore en Android): ni otras apps ni una copia del móvil pueden leerlo.
 * Aquí también se guardan el usuario y sus kits para que todas las pantallas los vean.
 */
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, ErrorApi, type KitUsuario, type Usuario } from "./api";

const CLAVE_TOKEN = "valentia_token";

interface Sesion {
  /** true mientras se lee el token guardado al abrir la app */
  cargando: boolean;
  token: string | null;
  usuario: Usuario | null;
  kits: KitUsuario[];
  /** Guarda la sesión nueva (después del código del email) */
  entrar: (token: string, usuario: Usuario) => Promise<void>;
  /** Vuelve a pedir los kits a la web */
  actualizar: () => Promise<void>;
  /** Activa un código de kit (escrito o leído del QR). Devuelve el kit desbloqueado. */
  activar: (
    codigo: string,
  ) => Promise<{ estado: "activado" | "ya-tienes"; kit: string | null }>;
  salir: () => Promise<void>;
}

const Contexto = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [kits, setKits] = useState<KitUsuario[]>([]);

  const olvidar = useCallback(async () => {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN).catch(() => {});
    setToken(null);
    setUsuario(null);
    setKits([]);
  }, []);

  const cargarDatos = useCallback(
    async (conToken: string) => {
      try {
        const datos = await api.yo(conToken);
        setUsuario(datos.usuario);
        setKits(datos.kits);
      } catch (error) {
        // Sesión cerrada desde la web (Mis dispositivos, cambio de contraseña…) o caducada
        if (error instanceof ErrorApi && error.estado === 401) await olvidar();
        else throw error;
      }
    },
    [olvidar],
  );

  // Al abrir la app: ¿había una sesión guardada?
  useEffect(() => {
    (async () => {
      const guardado = await SecureStore.getItemAsync(CLAVE_TOKEN).catch(
        () => null,
      );
      if (guardado) {
        setToken(guardado);
        await cargarDatos(guardado).catch(() => {
          // Sin conexión: seguimos con la sesión y lo intentamos al recargar
        });
      }
      setCargando(false);
    })();
  }, [cargarDatos]);

  const valor = useMemo<Sesion>(
    () => ({
      cargando,
      token,
      usuario,
      kits,
      entrar: async (nuevo, quien) => {
        // Si el almacén seguro fallara, la sesión dura hasta cerrar la app (no se rompe nada)
        await SecureStore.setItemAsync(CLAVE_TOKEN, nuevo).catch(() => {});
        setToken(nuevo);
        setUsuario(quien);
        await cargarDatos(nuevo).catch(() => {});
      },
      actualizar: async () => {
        if (token) await cargarDatos(token);
      },
      activar: async (codigo) => {
        if (!token) throw new ErrorApi("Vuelve a entrar.", 401);
        try {
          const r = await api.activar(token, codigo);
          setKits(r.kits);
          return { estado: r.estado, kit: r.kit };
        } catch (error) {
          if (error instanceof ErrorApi && error.estado === 401)
            await olvidar();
          throw error;
        }
      },
      salir: async () => {
        if (token) await api.salir(token).catch(() => {});
        await olvidar();
      },
    }),
    [cargando, token, usuario, kits, cargarDatos, olvidar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(Contexto);
  if (!sesion) throw new Error("useSesion fuera de ProveedorSesion");
  return sesion;
}
