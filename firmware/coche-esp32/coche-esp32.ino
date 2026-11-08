/*
 * VALENTIA · PROGRAMA DEL COCHE (ESP32)
 * ------------------------------------------------------------
 * Deja manejar el coche con el mando de la app de Valentia, por Bluetooth o por wifi,
 * y trae dos modos automáticos: seguir la línea y esquivar obstáculos.
 *
 *  - Bluetooth: el coche se anuncia como «Valentia-Coche-XXXX» (servicio UART de Nordic).
 *  - Wifi: el coche crea su propia red «Valentia-Coche-XXXX» (contraseña: valentia).
 *    La app se conecta a ws://192.168.4.1:81
 *  - Seguridad: si deja de llegar el mando durante medio segundo, el coche se para solo.
 *
 * Mensajes (los mismos por las dos vías; ver movil/src/control/protocolo.ts):
 *    App → coche:  "M <izq> <der>" (-100..100) · "P" (parar) · "O manual|linea|obstaculos" · "L" (sigo aquí)
 *    Coche → app:  "H <nombre> <versión>" · "D <cm>" (-1 = nada delante) · "O <modo>"
 *
 * Qué hace falta en el programa de Arduino (Arduino IDE 2):
 *  1. Placa: «esp32 by Espressif Systems», versión 3.x (Herramientas → Placa → Gestor de placas).
 *     Placa elegida: «ESP32 Dev Module».
 *  2. Librería: «WebSockets» de Markus Sattler (Programa → Incluir librería → Gestionar bibliotecas).
 *  3. Conectar la ESP32 por USB, elegir el puerto y pulsar «Subir».
 *
 * Conexiones (cámbialas abajo, en PINES, si tu coche va distinto):
 *    Driver L298N  ENA=14 IN1=27 IN2=26 · IN3=25 IN4=33 ENB=32  (quita los puentes de ENA y ENB)
 *    Sensores de línea TCRT5000 (salida D0): izquierdo=34, derecho=35
 *    Ultrasonidos HC-SR04P: TRIG=5, ECHO=18 (a 3,3 V)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define VERSION "1.0"

// ---------------------------------------------------------------- PINES
const int ENA = 14, IN1 = 27, IN2 = 26;   // motor izquierdo
const int ENB = 32, IN3 = 25, IN4 = 33;   // motor derecho
const int LINEA_IZQ = 34, LINEA_DER = 35;
const int TRIG = 5, ECHO = 18;

// Lo que da el sensor de línea encima de la línea negra (en la mayoría de módulos, HIGH).
// Si tu coche se va hacia fuera de la línea, cambia HIGH por LOW.
const int SOBRE_NEGRO = HIGH;

// Si un motor gira al revés, cambia su false por true
const bool INVERTIR_IZQ = false;
const bool INVERTIR_DER = false;

// ---------------------------------------------------------------- AJUSTES
const unsigned long MS_SIN_MANDO = 500;       // sin órdenes este tiempo → se para
const unsigned long MS_ENTRE_MEDIDAS = 100;   // cada cuánto mide la distancia
const unsigned long MS_ENTRE_AVISOS = 200;    // cada cuánto manda la distancia a la app
const int VELOCIDAD_AUTO = 55;                // % en los modos automáticos
const int CM_OBSTACULO = 20;                  // por debajo, esquiva

// Servicio UART de Nordic (el mismo que usa la app)
#define UUID_SERVICIO "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define UUID_RX       "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define UUID_TX       "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

// ---------------------------------------------------------------- ESTADO
enum Modo { MANUAL, LINEA, OBSTACULOS };
Modo modo = MANUAL;
String nombre;
unsigned long ultimaOrden = 0;
long distanciaCm = -1;

WebSocketsServer ws(81);
BLECharacteristic *caracteristicaTx = nullptr;
bool bleConectado = false;
String bufferBle;

// ---------------------------------------------------------------- MOTORES
/** velocidad de -100 (atrás) a 100 (adelante) */
void motor(int en, int a, int b, int velocidad, bool invertir) {
  velocidad = constrain(velocidad, -100, 100);
  if (invertir) velocidad = -velocidad;
  digitalWrite(a, velocidad > 0 ? HIGH : LOW);
  digitalWrite(b, velocidad < 0 ? HIGH : LOW);
  analogWrite(en, map(abs(velocidad), 0, 100, 0, 255));
}

void mover(int izq, int der) {
  motor(ENA, IN1, IN2, izq, INVERTIR_IZQ);
  motor(ENB, IN3, IN4, der, INVERTIR_DER);
}

void parar() { mover(0, 0); }

// ---------------------------------------------------------------- ENVIAR A LA APP
void enviar(const String &linea) {
  String texto = linea + "\n";
  ws.broadcastTXT(texto);
  if (bleConectado && caracteristicaTx) {
    caracteristicaTx->setValue((uint8_t *)texto.c_str(), texto.length());
    caracteristicaTx->notify();
  }
}

const char *textoModo(Modo m) {
  return m == LINEA ? "linea" : m == OBSTACULOS ? "obstaculos" : "manual";
}

// ---------------------------------------------------------------- ÓRDENES DE LA APP
void procesar(String linea) {
  linea.trim();
  if (linea.length() == 0) return;
  ultimaOrden = millis();
  char clave = linea.charAt(0);

  if (clave == 'M' && modo == MANUAL) {
    int espacio = linea.indexOf(' ', 2);
    if (espacio < 0) return;
    int izq = linea.substring(2, espacio).toInt();
    int der = linea.substring(espacio + 1).toInt();
    mover(izq, der);
  } else if (clave == 'P') {
    modo = MANUAL;
    parar();
  } else if (clave == 'O') {
    String m = linea.substring(2);
    modo = m == "linea" ? LINEA : m == "obstaculos" ? OBSTACULOS : MANUAL;
    parar();
    enviar(String("O ") + textoModo(modo));
  }
}

// ---------------------------------------------------------------- WIFI
void alEventoWs(uint8_t cliente, WStype_t tipo, uint8_t *datos, size_t largo) {
  if (tipo == WStype_CONNECTED) {
    String hola = "H " + nombre + " " VERSION "\n";
    String estado = String("O ") + textoModo(modo) + "\n";
    ws.sendTXT(cliente, hola);
    ws.sendTXT(cliente, estado);
  } else if (tipo == WStype_TEXT) {
    procesar(String((char *)datos, largo));
  } else if (tipo == WStype_DISCONNECTED) {
    parar();
  }
}

// ---------------------------------------------------------------- BLUETOOTH
class AlConectar : public BLEServerCallbacks {
  void onConnect(BLEServer *) override {
    bleConectado = true;
    ultimaOrden = millis();
  }
  void onDisconnect(BLEServer *servidor) override {
    bleConectado = false;
    modo = MANUAL;
    parar();
    servidor->getAdvertising()->start();  // que se pueda volver a conectar
  }
};

class AlRecibir : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    bufferBle += c->getValue();  // pueden llegar varias órdenes juntas o una a trozos
    int fin;
    while ((fin = bufferBle.indexOf('\n')) >= 0) {
      procesar(bufferBle.substring(0, fin));
      bufferBle.remove(0, fin + 1);
    }
    if (bufferBle.length() > 200) bufferBle = "";
  }
};

void iniciarBluetooth() {
  BLEDevice::init(nombre.c_str());
  BLEDevice::setMTU(185);
  BLEServer *servidor = BLEDevice::createServer();
  servidor->setCallbacks(new AlConectar());
  BLEService *servicio = servidor->createService(UUID_SERVICIO);

  caracteristicaTx = servicio->createCharacteristic(UUID_TX, BLECharacteristic::PROPERTY_NOTIFY);
  caracteristicaTx->addDescriptor(new BLE2902());

  BLECharacteristic *rx = servicio->createCharacteristic(
      UUID_RX, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rx->setCallbacks(new AlRecibir());

  servicio->start();
  BLEAdvertising *anuncio = BLEDevice::getAdvertising();
  anuncio->addServiceUUID(UUID_SERVICIO);
  anuncio->setScanResponse(true);
  BLEDevice::startAdvertising();
}

// ---------------------------------------------------------------- SENSORES
long medirDistancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 25000);  // máximo ~4 m
  if (us == 0) return -1;
  return us / 58;  // el sonido va y vuelve: µs / 58 = cm
}

// ---------------------------------------------------------------- MODOS AUTOMÁTICOS
void seguirLinea() {
  bool izq = digitalRead(LINEA_IZQ) == SOBRE_NEGRO;
  bool der = digitalRead(LINEA_DER) == SOBRE_NEGRO;
  if (izq && !der) mover(-VELOCIDAD_AUTO / 2, VELOCIDAD_AUTO);       // la línea se va a la izquierda
  else if (der && !izq) mover(VELOCIDAD_AUTO, -VELOCIDAD_AUTO / 2);  // se va a la derecha
  else mover(VELOCIDAD_AUTO, VELOCIDAD_AUTO);                        // centrado: recto
}

// Esquivar: si hay algo cerca, marcha atrás un poco y gira; después, sigue recto
unsigned long finManiobra = 0;
int fase = 0;  // 0 = recto, 1 = atrás, 2 = girando

void esquivar() {
  unsigned long ahora = millis();
  if (fase == 0) {
    if (distanciaCm > 0 && distanciaCm < CM_OBSTACULO) {
      fase = 1;
      finManiobra = ahora + 350;
      mover(-VELOCIDAD_AUTO, -VELOCIDAD_AUTO);
    } else {
      mover(VELOCIDAD_AUTO, VELOCIDAD_AUTO);
    }
  } else if (ahora > finManiobra) {
    if (fase == 1) {
      fase = 2;
      finManiobra = ahora + 400;
      mover(VELOCIDAD_AUTO, -VELOCIDAD_AUTO);
    } else {
      fase = 0;
    }
  }
}

// ---------------------------------------------------------------- INICIO
void setup() {
  Serial.begin(115200);
  for (int p : {ENA, IN1, IN2, ENB, IN3, IN4, TRIG}) pinMode(p, OUTPUT);
  pinMode(LINEA_IZQ, INPUT);
  pinMode(LINEA_DER, INPUT);
  pinMode(ECHO, INPUT);
  parar();

  // Nombre único por coche: las 4 últimas cifras de la dirección de la placa
  char sufijo[5];
  snprintf(sufijo, sizeof(sufijo), "%04X", (uint16_t)(ESP.getEfuseMac() >> 32));
  nombre = String("Valentia-Coche-") + sufijo;

  WiFi.mode(WIFI_AP);
  WiFi.softAP(nombre.c_str(), "valentia");
  ws.begin();
  ws.onEvent(alEventoWs);

  iniciarBluetooth();
  Serial.println(nombre + " listo. Wifi: " + WiFi.softAPIP().toString() + ":81 · Bluetooth activo");
}

// ---------------------------------------------------------------- BUCLE
unsigned long ultimaMedida = 0, ultimoAviso = 0;

void loop() {
  ws.loop();
  unsigned long ahora = millis();

  if (ahora - ultimaMedida >= MS_ENTRE_MEDIDAS) {
    ultimaMedida = ahora;
    distanciaCm = medirDistancia();
  }
  if (ahora - ultimoAviso >= MS_ENTRE_AVISOS) {
    ultimoAviso = ahora;
    enviar("D " + String(distanciaCm));
  }

  // Sin mando conectado, o sin noticias de la app (también en automático: la app manda "L"): quieto
  bool hayMando = bleConectado || ws.connectedClients() > 0;
  if (!hayMando || ahora - ultimaOrden > MS_SIN_MANDO) {
    modo = MANUAL;
    parar();
    return;
  }

  if (modo == LINEA) seguirLinea();
  else if (modo == OBSTACULOS) esquivar();
}
