# Criterios de diseño de la tienda (el «cerebro» de Jesse)

Todo lo que Jesse ha pedido para la parte pública de la web (lo que ve un cliente). Antes de enseñarle
cualquier cambio, se puntúa de 0 a 10 con la tabla de abajo. **Solo se le enseña lo que saca un 10.**
Si algo baja de 10, se corrige y se vuelve a puntuar. Cada mensaje nuevo de Jesse se añade aquí.

## Lo que pide Jesse (11-11-2026)

1. **Que el cliente diga «wow» de lo chula que está.** Tiene que estar entre las webs mejor hechas del mercado.
2. **Que no parezca hecha con IA ni una plantilla barata.** Nada de detalles poco realistas.
3. **Lo más realista, visual y profesional posible.** Gráficos hiperrealistas, como los de visualizalo.es
   (materiales realistas, piezas que se giran arrastrando, ver el producto a tamaño real).
4. **Poco texto y poco detalle.** La web es para niños, padres, gente de 30-40 años y personas mayores:
   no puede parecer el catálogo técnico de un mueble. Pocos botones, pocos números, frases cortas.
5. **Animaciones, sí, pero profesionales.** Suaves y con sentido; nada chabacano ni de feria.
6. **Se parte de la web que ya existe.** Mismas secciones y contenido de base, mejorados rincón a rincón:
   nombres de los apartados, diseño, texturas, tipografía, composición, imágenes y textos.
7. **Los paneles internos no se tocan** (admin, hardware, editor, mensajes, finanzas, stock…): están perfectos.
8. **Configurador en 3D:** las piezas que ya hay en la web se ven en 3D con sus colores; cuando Alonso
   mande los modelos reales (.obj/.stl), se cambian por esos. Medidas, zoom y girar.
9. **Nunca olvidar el objetivo de Valentia:** vender kits de robótica fáciles de montar (sin soldar) para
   todas las edades y, mientras la tienda esté cerrada, que la gente se apunte a la lista de espera.
10. **Organización clara.** Un orden lógico de arriba abajo, cada cosa en su sitio y nada que aparezca
    de golpe y sin sentido (en la web del chip verde «las cosas aparecían de repente sin organización»).
11. **Si algo no se puede hacer porque falta algo (un enlace, un archivo, un permiso), decírselo claro.**

Recordatorios de la memoria del proyecto: textos humanos, nunca de anuncio; pilas y cable USB incluidos;
el coche se llama «Kit de coche robótico multifunción VR1 - Starter Kit»; montaje plug & play.

## Tabla de puntuación (cada punto suma lo indicado; 10 = perfecto)

| Punto | Pregunta | Vale |
| --- | --- | --- |
| Wow | ¿Un cliente que entra diría «qué pasada» en los primeros 3 segundos? | 2 |
| Realismo | ¿Las imágenes y el 3D parecen producto real, con luz y materiales creíbles? | 2 |
| Sencillez | ¿Lo entendería a la primera un niño de 10 años y una persona de 70? ¿Sobra algún texto, botón o número? | 2 |
| Movimiento | ¿Las animaciones son suaves, con sentido y van fluidas en un móvil normal? | 1 |
| Sin IA | ¿Nada suena a plantilla o a texto de IA (degradados raros, adornos, «¡…!», etiquetas técnicas)? | 1 |
| Orden | ¿Se entiende el recorrido de arriba abajo y nada aparece de golpe? (cuenta dentro de Sencillez) | — |
| Objetivo | ¿Lleva a ver los kits y a apuntarse a la lista de espera sin perderse? | 1 |
| Calidad | ¿Funciona en móvil y ordenador, sin errores, rápido y accesible? | 1 |

Un 10 exige que cada punto tenga su nota máxima. Si alguno no la tiene, no se enseña.

## Registro de puntuaciones

- 11-11-2026 · Visor 3D, versión 1 (pieza negra de prueba, 5 botones, medidas y texto debajo): **4/10**.
  Jesse: «demasiado detalle y texto». Fallaban Sencillez y Realismo.
- 11-11-2026 · Visor 3D, versión 2 (sin pestañas ni botones, gira sola, un botón «Medidas»): enseñada en el PR #106.
- 11-11-2026 · Rediseño de la tienda pública, estilo «estudio» (portada con el coche VR1 en 3D que se abre al
  bajar, kits en 3D en su ficha, cabeceras de papel, menos texto): **8/10**. Wow 1,5 · Realismo 1 · Sencillez 2 ·
  Movimiento 1 · Sin IA 1 · Objetivo 1 · Calidad 0,5. Falta para el 10: los modelos reales de Alonso (los de
  ahora están dibujados por código y no son hiperrealistas), fotos reales de los kits, las capturas de
  visualizalo.es (bloqueada en la nube) y probarlo en un móvil de verdad. Se le enseña a Jesse porque lo pidió
  para probarlo en su ordenador, diciéndole claro la nota y lo que falta.

## Peticiones añadidas (11-11-2026, segunda tanda)

12. **Poder probarlo en su ordenador (localhost), también en Windows,** antes de publicarlo.
13. **Si el trabajo se corta por el límite de uso, seguir solo** en cuanto se restablezca.

## Cambio de rumbo (12-11-2026)

14. **Fuera el estilo «estudio»: se sigue `PROMPT_REDISENO.md`** (hardware industrial: carbón y papel de plano, un solo
    naranja, letra mono para los datos, cajas de plano CAD, textos de ingeniero). Este prompt manda sobre los puntos
    4 y 6 de arriba donde choquen (ahora sí hay datos técnicos, pero todos reales y sacados de la base de datos).
15. **Portada: el despiece en un escritorio iluminado con personas reales montando el kit, y animado.** Jesse mandó la
    foto del abuelo y la nieta en el taller: va de fondo grande, con toque 3D (se mueve en profundidad con el ratón) y
    el coche 3D encima de su mesa con la perspectiva de la foto. Lo que tienen en las manos solo se puede cambiar por el
    kit generando la foto otra vez (aquí no hay generador de imágenes): se le dice y se le da el texto para hacerlo.

- 12-11-2026 · Tienda industrial + foto del taller en 3D: **9/10**. Wow 2 · Realismo 1,5 · Sencillez 1,5 · Movimiento 1 ·
  Sin IA 1 · Objetivo 1 · Calidad 1. Falta para el 10: la foto con el kit de verdad en las manos y los modelos reales de
  Alonso; probado en Chrome sin tarjeta gráfica (en un móvil de verdad irá más suave).
