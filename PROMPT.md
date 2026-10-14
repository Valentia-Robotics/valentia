# Proyecto: Valentia — tienda de kits de robótica con cursos

Soy principiante y no sé programar. Háblame siempre en español y explícame cada paso como si fuera la primera vez que hago una web.

## Objetivo
Crear la web de mi startup, Valentia, con una estructura profesional y escalable, que pueda abrir, entender y modificar en Visual Studio Code. Esta fase es una versión local completamente funcional, con pagos simulados.

## La marca
- Nombre: Valentia. Úsalo en títulos, metadatos de las páginas, textos y pie de página (© Valentia).
- Logo: está en imagenes/logo.png. Esa carpeta guarda mis originales: no la borres ni la modifiques.
  - Copia el logo a la carpeta pública de la web (por ejemplo public/images/brand/logo.png) y úsalo en la barra de navegación y en el pie de página.
  - Genera a partir de él el favicon y los iconos de la web.
  - Mira el logo y extrae sus colores para construir la paleta del sistema de diseño (color principal, secundario, fondos claros y oscuros). Explícame qué colores has elegido y por qué.
  - Si el logo no se ve bien sobre fondos oscuros, dímelo y propón una solución.
- Tono de los textos: cercano, motivador, que transmita que cualquiera puede atreverse a construir su propio robot.

## El negocio
- Vendemos kits de robótica cerrados (por ejemplo, un coche robot) y componentes sueltos.
- Hay un configurador donde el cliente monta su propio robot añadiendo componentes, y la web avisa de incompatibilidades.
- Cada kit físico lleva un QR con un código único. Al escanearlo, el cliente llega a /activar?codigo=XXXX, inicia sesión, y el curso de ese kit queda guardado en "Mis cursos" (vídeos y ejercicios).

## Tecnología (usa las versiones estables actuales y consulta su documentación si dudas)
- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite en local, preparado para cambiar a PostgreSQL en producción cambiando solo la conexión
- Auth.js (NextAuth) con email y contraseña, contraseñas cifradas
- Zustand para el carrito, guardado en el navegador
- Zod para validar datos
- Una librería para generar códigos QR
- ESLint + Prettier

## Estructura de carpetas (orientativa, mejórala si lo ves necesario y explícame por qué)
imagenes/            → mis originales (logo.png). No tocar.
src/
  app/
    (tienda)/        → inicio, kits, kits/[slug], componentes, configurador, carrito
    (auth)/          → login, registro
    (cuenta)/        → cursos, cursos/[slug], cursos/[slug]/[leccion]  (protegidas)
    activar/
    api/
  components/
    ui/              → botones, tarjetas, modales reutilizables
    layout/          → navegación, pie de página
    tienda/  configurador/  cursos/
  lib/               → db, auth, reglas de compatibilidad, utilidades
  store/             → carrito
  types/
prisma/              → schema.prisma, seed.ts
data/                → componentes.json, kits.json, cursos.json (fuente de los datos de prueba)
public/images/       → brand/, componentes/, kits/

## Diseño general
- Sistema de diseño propio basado en los colores del logo de Valentia: colores, tipografías, radios y sombras definidos en un único sitio para poder cambiarlos fácilmente.
- Inspirado en el estilo de la web de Apple y de los quioscos de pedidos de McDonald's, pero SIN usar sus logos, nombres, textos, imágenes ni tipografías propietarias. La identidad es la de Valentia.
- Responsive (perfecto en móvil) y accesible.

## Página de inicio (estilo web de Apple)
- Barra de navegación fija, fina y translúcida con desenfoque: logo de Valentia, Kits, Componentes, Configurador, Mis cursos, icono de carrito con contador, Iniciar sesión.
- Hero a pantalla completa con el kit estrella: titular grande, subtítulo corto, enlaces "Comprar" y "Más información", imagen grande centrada.
- Una sección por kit, alternando fondos claros y oscuros, con mucho espacio en blanco, tipografía grande y animaciones suaves al hacer scroll (respetando prefers-reduced-motion).
- Bloque "Crea tu propio robot" que lleva al configurador.
- Bloque que explique que cada kit de Valentia incluye un curso al que se accede con el QR de la caja.
- Pie de página con el logo y columnas de enlaces.

## Ficha de kit
- Imagen grande, precio, descripción, componentes incluidos, temario del curso.
- Botón "Añadir al carrito" y botón "Personalizar este kit", que abre el configurador con sus componentes ya cargados.

## Configurador (estilo quiosco de pedidos de McDonald's)
- Columna izquierda con categorías grandes con icono: Placas, Motores, Sensores, Alimentación, Chasis y ruedas, Extras.
- Zona central con una rejilla de tarjetas grandes: foto del componente, nombre, precio y un botón grande "Añadir". Al pulsar la tarjeta se abre un detalle con datos técnicos y selector de cantidad.
- Panel "Tu robot" siempre visible: componentes añadidos, botones + y −, total en tiempo real y botón grande "Añadir al carrito". Pequeña animación al añadir.
- Avisos de compatibilidad claros, con las reglas definidas como datos (no escritas a fuego) en lib/compatibilidad: voltajes, consumo total frente a la batería, componentes que necesitan otro (un motor necesita driver), pines disponibles en la placa.
- Opción de empezar desde cero o desde un kit.
- En móvil: categorías como barra horizontal deslizable y "Tu robot" como panel inferior desplegable.

## Carrito y compra simulada
- El carrito admite kits, componentes sueltos y configuraciones personalizadas.
- Checkout simulado, con el código preparado para integrar Stripe más adelante: crea el pedido en la base de datos y, por cada kit comprado, genera un código de activación único y muestra su QR tal y como se imprimiría en la tarjeta de la caja, con el logo de Valentia.

## Activación y "Mis cursos" (requiere iniciar sesión)
- /activar?codigo=XXXX: si no hay sesión, pide iniciar sesión o registrarse y después vuelve automáticamente. Valida que el código existe y no se ha usado, lo vincula al usuario y desbloquea el curso.
- /cursos: rejilla con los cursos del usuario y su progreso.
- Página de curso: lista de lecciones en un lateral, reproductor de vídeo, descripción y botón "Marcar como completada".
- Ejercicios: tests de opción múltiple con corrección y explicación, y retos prácticos con pistas y solución desbloqueable.
- El progreso se guarda en la base de datos. Las rutas de cuenta están protegidas.

## Datos de prueba
- 18 componentes realistas (Arduino Uno, ESP32, motores DC, servos, driver de motores, sensor de ultrasonidos, sensores de línea, portapilas, chasis…) con precio, stock, voltaje, consumo, conector y pines.
- 3 kits de Valentia: coche seguidor de líneas, brazo robótico y estación meteorológica.
- 3 cursos de 4 o 5 lecciones cada uno. Para los vídeos usa un marcador fácil de sustituir por URLs reales.
- Imágenes de productos: crea ilustraciones SVG sencillas como marcador de posición en public/images/componentes y public/images/kits, con nombres claros, para que yo las sustituya por fotos reales con el mismo nombre.
- El seed crea un usuario de prueba y varios códigos de activación sin usar. Pon las credenciales en el README.

## Calidad
- Componentes pequeños y reutilizables, tipos de TypeScript, comentarios en español en las partes clave.
- Secretos en .env, con un .env.example sin secretos, y un .gitignore correcto (la carpeta imagenes/ sí debe guardarse en git).
- `npm run lint` y `npm run build` deben pasar sin errores.
- README.md en español: qué hay en cada carpeta, cómo arrancar el proyecto y cómo cambiar productos, imágenes, logo, colores y vídeos.

## Cómo quiero que trabajes
1. Empieza planificando: lee todo esto, mira el logo, propónme el plan por fases, la estructura final y la paleta de colores, y espera a que lo apruebe.
2. Crea un CLAUDE.md con el contexto de Valentia y estas reglas de trabajo.
3. Fases: (1) base, sistema de diseño, logo y navegación; (2) inicio y fichas de kit; (3) configurador; (4) carrito y compra simulada; (5) login, activación y cursos; (6) repaso final de calidad. Inicializa git y haz un commit al terminar cada fase.
4. Al terminar cada fase, dime exactamente qué comandos ejecutar, qué dirección abrir en el navegador y qué debería ver.
5. Antes de instalar cualquier paquete, explícame en una frase para qué sirve.
6. Si hay que tomar una decisión importante, pregúntame antes.