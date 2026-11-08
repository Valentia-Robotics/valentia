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
  De momento salen como «Muy pronto»; el curso se abre en la web.

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
- El Bluetooth (control remoto del coche con ESP32) necesitará una «development build» (`eas build --profile
  development`), porque Expo Go no trae Bluetooth.
