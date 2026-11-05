# Tarjetas láser → Bambu Suite (Windows)

Cuando descargas desde el panel de admin el ZIP de tarjetas (`tarjetas-laser-*.zip`), este programa:

1. Espera a que la descarga termine del todo.
2. Reparte las tarjetas de 9 en 9 en una rejilla fija 3x3 (85,6 × 54 mm, 5 mm de separación,
   primera tarjeta en X 21,6 mm · Y 39 mm de la base láser). Siempre las mismas coordenadas.
3. Crea por cada grupo `Proyecto_NN_delantero.lac` y `Proyecto_NN_trasero.lac`
   (en la trasera las columnas van al revés, porque la tarjeta se gira como una página) y un `ORDEN.txt`,
   en `Descargas\Tarjetas_laser_listas\<nombre del zip>\`.
4. Los abre en Bambu Suite, directamente en **Preparar**, con relleno láser y material
   "Aluminium Office Card - Black" para la Bambu Lab H2C 40 W.

El navegador no puede ejecutar programas del ordenador al pulsar un botón de una web (por seguridad),
así que el programa vigila la carpeta Descargas y reacciona en cuanto llega el ZIP.

## Ponerlo en marcha

Doble clic en `Activar al encender el PC.bat` (una sola vez). Para quitarlo: `Desactivar.bat`.
Necesita Python 3 y Bambu Suite instalados. Registro de lo que hace: `vigilante.log`.
