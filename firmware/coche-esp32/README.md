# Programa del coche (ESP32)

Es el programa que se carga en la ESP32 del coche para que la app de Valentia lo maneje con el mando,
por **Bluetooth** o por **wifi**. Trae también dos modos automáticos: **seguir la línea** y **esquivar obstáculos**.

## Cargarlo en el coche (una vez por coche, antes de meterlo en la caja)

1. Instala el **Arduino IDE 2** (arduino.cc/en/software).
2. Añade las placas ESP32: Archivo → Preferencias → «URLs adicionales de gestor de placas»:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`.
   Luego Herramientas → Placa → Gestor de placas → busca **esp32** (de Espressif) e instala la **versión 3**.
3. Instala la librería **WebSockets** de *Markus Sattler*: Programa → Incluir librería → Gestionar bibliotecas.
4. Abre `coche-esp32.ino`, elige la placa **ESP32 Dev Module** y el puerto USB, y pulsa **Subir** (la flecha).
5. Abre el Monitor Serie (115200): debe salir «Valentia-Coche-XXXX listo».

## Conexiones

| Pieza | Pin de la ESP32 |
| --- | --- |
| L298N motor izquierdo | ENA 14 · IN1 27 · IN2 26 |
| L298N motor derecho | ENB 32 · IN3 25 · IN4 33 |
| Sensor de línea izquierdo / derecho (D0) | 34 / 35 |
| Ultrasonidos HC-SR04P | TRIG 5 · ECHO 18 (alimentado a 3,3 V) |

En el L298N hay que **quitar los puentes de ENA y ENB** para poder cambiar la velocidad.
Si un motor gira al revés o el coche se sale de la línea, se cambia arriba del programa (`INVERTIR_IZQ`,
`INVERTIR_DER`, `SOBRE_NEGRO`); no hace falta tocar cables.

## Cómo se habla con la app

- **Bluetooth**: el coche se anuncia como `Valentia-Coche-XXXX` (servicio UART de Nordic). La app lo encuentra sola.
- **Wifi**: el coche crea la red `Valentia-Coche-XXXX` con la contraseña `valentia`. El móvil se conecta a esa red
  y la app habla con `ws://192.168.4.1:81`. En Android, si el móvil dice «sin internet», hay que pulsar «Mantener
  conexión»; si aun así no conecta, apaga los datos móviles mientras usas el mando.
- **Seguridad**: si el coche deja de recibir noticias de la app durante medio segundo, se para solo.

Los mensajes están explicados en `movil/src/control/protocolo.ts` (los mismos por las dos vías).
