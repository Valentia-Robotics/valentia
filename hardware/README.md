# Placas modulares (KiCad)

Placas para que los módulos del coche se conecten **solo con apoyarlos**: pines pogo + imanes de neodimio.

| Carpeta | Qué es |
| --- | --- |
| `placa-base-esp32/` | Va **encima** de la ESP32-DevKitC (38 pines). Lleva 38 agujeros para los pines de la ESP32 y, en un extremo, 4 plaquitas redondas (3V3, TRIG, ECHO, GND) entre 2 agujeros de imán. 72 × 40 mm. |
| `modulo-ultrasonidos/` | Plaquita del sensor HC-SR04P: por debajo 4 pines pogo y 2 imanes en la misma posición que la placa base; por arriba, los 4 agujeros del sensor. 19 × 30 mm. |

Se abren con KiCad 7, 8 o 9 (archivo `.kicad_pro`). Cada proyecto trae su biblioteca de huellas `valentia.pretty`.

## Medidas elegidas (cambiar en `generar_placas.py`, apartado MEDIDAS)

- ESP32-DevKitC de 38 pines, filas a 25,4 mm. USB hacia la izquierda; la antena queda bajo una zona sin pistas.
- TRIG = GPIO5 y ECHO = GPIO18 (igual que `firmware/coche-esp32`). Alimentación 3,3 V: el HC-SR04P funciona a 3,3 V
  (un HC-SR04 normal de 5 V mandaría 5 V al GPIO18 y no se debe usar sin divisor).
- Contactos: plaquitas de 2,2 mm al paso de 2,54 mm. Pedir la placa con acabado **ENIG** (oro) para que no se oxiden.
- Imanes de disco 6 × 3 mm, agujero de 6,2 mm (se pegan con cianoacrilato o epoxi), a 9,5 mm del centro de los contactos.
- Polaridad: en la base el imán de arriba con el **N** hacia arriba y el de abajo con el **S**; en el módulo al revés
  (lo pone la serigrafía de debajo). Así el módulo solo se pega en el sentido correcto: al revés se repele.
- Pines pogo: tira de 1 × 4 al paso de 2,54 mm (agujero de 1 mm), soldada con los muelles hacia abajo.
  El imán del módulo debe sobresalir por debajo un poco menos que el recorrido del pogo, para que los muelles queden medio apretados.

## Volver a generar

```
python3 hardware/generar_placas.py     # necesita KiCad instalado (módulo pcbnew)
```

Comprobado con el DRC de KiCad: 0 errores y 0 conexiones sin hacer en las dos placas; el esquema y la placa tienen las mismas conexiones.
