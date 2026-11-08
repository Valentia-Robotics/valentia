# App de Valentia (Android y iPhone)

La app del móvil usa **las mismas cuentas, códigos y cursos que la web**. El cliente entra con su cuenta,
escanea el QR de la tarjeta de su kit (o escribe el código) y la app le enseña lo que desbloquea ese kit.

Está hecha con **Expo** (React Native): el mismo código sirve para Android y para iPhone.

## Qué hace esta primera versión

- **Entrar** con email y contraseña. Como en la web, cada móvil nuevo confirma con un código que llega al email.
  La cuenta se crea en la web (el botón abre la web en el navegador del móvil).
- **Mis kits**: los kits que tienes, con el progreso de su curso.
- **Añadir un kit**: escanear el QR de la tarjeta con la cámara o escribir el código `VAL-XXXX-XXXX`.
  Es el mismo código que en la web: si ya lo activaste allí, el kit ya sale en la app.
- **Ficha del kit**: sus funciones (control remoto del coche, mover el brazo, el tiempo de la estación…).
  Las que aún no están hechas salen como «Muy pronto»; el curso se abre en la web.
- **Mando del coche** (kit del coche): joystick, velocidad (Tortuga, Normal, Turbo), modos (conduces tú, sigue la
  línea, esquiva solo), distancia al obstáculo y botón PARAR. Habla con la ESP32 del coche por **wifi** o **Bluetooth**.
  El programa del coche está en `firmware/coche-esp32/` (instrucciones en su README).

### Probar el mando

- **Por wifi** (funciona en Expo Go): enciende el coche, conecta el móvil a la red `Valentia-Coche-XXXX`
  (contraseña `valentia`; si Android avisa de «sin internet», elige «Mantener conexión») y pulsa «Wifi» en el mando.
- **Por Bluetooth**: Expo Go no trae Bluetooth. Hace falta una «development build»:
  `npx eas-cli@latest build --profile development --platform android` (cuenta gratis en expo.dev) e instalar el APK.
- **Sin coche**: botón «Probar sin coche». Sale una pista con un coche de mentira (`src/control/cocheSimulado.ts`)
  que entiende las mismas órdenes que la ESP32: se conduce, sigue la línea y esquiva las cajas.

Qué desbloquea cada kit se decide en la web: `frontend/src/config/app.ts`.

## Probarla en tu móvil (sin publicar nada)

Hace falta que la web ya tenga la parte de la app publicada (este cambio unido a `main` y desplegado en Render),
porque la app habla con `https://valentiarobotics.com`.

1. En el móvil Android, instala **Expo Go** desde Google Play (es gratis).
2. En el ordenador, dentro de la carpeta del proyecto:

   ```bash
   cd movil
   npm ci
   npm start
   ```

3. Sale un QR en la terminal. Ábrelo con Expo Go (el móvil y el ordenador en la misma wifi).
   Si no conecta, para con Ctrl+C y prueba `npx expo start --tunnel`.

Para probar contra la web de tu ordenador (`npm run dev` en `frontend/`) en vez de la real, arranca con la
dirección de tu ordenador en la wifi: `EXPO_PUBLIC_WEB=http://192.168.1.20:3000 npm start`.

## Publicarla en Google Play (más adelante)

1. Cuenta de desarrollador de Google Play: **25 $ una sola vez** (play.google.com/console).
   Las cuentas personales nuevas tienen que hacer una prueba cerrada con al menos 12 personas durante 14 días
   antes de poder publicar.
2. Cuenta gratuita en **expo.dev** (para compilar la app en la nube, sin instalar Android Studio).
3. `npx eas-cli@latest build --platform android` genera el archivo `.aab` que se sube a Google Play.

Para iPhone: cuenta de Apple Developer (**99 $ al año**). No hace falta un Mac: `eas build --platform ios`
compila en la nube.

## Para programadores

- Rutas en `src/app/` (Expo Router), conexión con la web en `src/lib/api.ts`, sesión en `src/lib/sesion.tsx`
  (token en `expo-secure-store`), colores en `src/lib/tema.ts`.
- La web: `frontend/src/lib/app/api.ts` (rutas `/api/app/*`, también en `backend/app.ts`). Cada móvil es un
  «dispositivo de confianza» (sale en «Mis dispositivos» de la web y se puede cerrar desde allí).
- Comprobar antes de subir: `npm run tipos` y `npm run lint`.
- Paquetes: siempre con `npx expo install <paquete>` (elige la versión que va con el SDK de Expo).
- Mando: `src/app/mando.tsx`, `src/componentes/Joystick.tsx` y `src/control/` (protocolo de texto, una orden por
  línea, igual por wifi y Bluetooth: `protocolo.ts`; `conexionWifi.ts` WebSocket a `ws://192.168.4.1:81/`;
  `conexionBluetooth.ts` con react-native-ble-plx, servicio Nordic UART; `useMando.ts` manda `M izq der` cada 150 ms).
  El coche se para si pasa medio segundo sin recibir nada. Pruebas del protocolo: `npm test`.
- El Bluetooth necesita una «development build» (`eas build --profile development`), porque Expo Go no lo trae.
