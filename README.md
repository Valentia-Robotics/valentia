# Valentia

Web de **Valentia**: kits de robótica y componentes, con cursos que se desbloquean con el QR de cada caja.

> Estado: **fase 5 de 6** (portada, kits, configurador, compra simulada, cuentas, activación y cursos). Este README se completará en la fase 6.

## Cómo arrancar el proyecto

Necesitas tener instalado [Node.js](https://nodejs.org) 22 o superior.

```bash
npm install        # descarga las librerías (solo la primera vez)
npm run setup      # crea la base de datos y carga los datos de prueba (solo la primera vez)
npm run dev        # arranca la web en modo desarrollo
```

Abre **http://localhost:3000** en el navegador. Cada vez que guardes un archivo, la página se actualiza sola.
Para pararla, pulsa `Ctrl + C` en la terminal.

Si es la primera vez y no tienes archivo `.env`, copia `.env.example` como `.env` **antes** de `npm run setup`
y genera la clave secreta de las sesiones con `npx auth secret` (o pon en `AUTH_SECRET` un texto largo y aleatorio).

### Cuenta y códigos de prueba

El seed crea un **usuario de prueba** (solo para tu ordenador, no lo uses en la web publicada):

| Email                  | Contraseña   |
| ---------------------- | ------------ |
| `prueba@valentia.test` | `robots2026` |

Empieza sin cursos. Para probar todo el recorrido del QR de la caja:

1. Abre **http://localhost:3000/activar?codigo=VAL-PRUE-CAR2** (es lo que abriría el QR).
2. Pulsa «Ya tengo cuenta: iniciar sesión» y entra con el usuario de prueba. Volverás solo a la activación.
3. Pulsa «Activar mi curso». El curso del coche aparece en **Mis cursos** (http://localhost:3000/cursos).

**Códigos de activación de prueba** (sin usar): `VAL-PRUE-CAR2`, `VAL-PRUE-CAR3` (coche),
`VAL-PRUE-BRZ2`, `VAL-PRUE-BRZ3` (brazo) y `VAL-PRUE-MET2`, `VAL-PRUE-MET3` (estación meteorológica).
Cada vez que ejecutas `npm run db:seed` vuelven a quedar sin usar (y las cuentas pierden sus cursos y su progreso).

### Otros comandos

| Comando              | Para qué sirve                                                          |
| -------------------- | ----------------------------------------------------------------------- |
| `npm run build`      | Prepara la versión final y optimizada de la web                         |
| `npm run start`      | Arranca la versión final (después de `build`)                           |
| `npm run lint`       | Revisa el código en busca de errores                                    |
| `npm run format`     | Ordena y da formato a todo el código                                    |
| `npm run marca`      | Regenera el favicon, los iconos y las versiones PNG del logo            |
| `npm run db:seed`    | Vuelve a cargar `data/*.json` (y borra los pedidos de prueba)           |
| `npm run db:reset`   | Borra la base de datos local y la crea de nuevo con los datos de prueba |
| `npm run db:migrate` | Aplica cambios de `prisma/schema.prisma` a la base de datos             |
| `npm run db:studio`  | Abre un panel en el navegador para ver y editar la base de datos        |

## Qué hay en cada carpeta

| Carpeta                                             | Contenido                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| `imagenes/`                                         | Tus originales (logo.png). No se modifican nunca.                   |
| `public/images/brand/`                              | Logo para la web (SVG y PNG) e iconos                               |
| `public/images/componentes/`, `public/images/kits/` | Imágenes de productos (ilustraciones de muestra en SVG)             |
| `data/`                                             | **Datos de prueba**: componentes, kits y cursos (archivos JSON)     |
| `prisma/`                                           | Base de datos: esquema, migraciones, seed y el archivo `dev.db`     |
| `scripts/`                                          | Programas de ayuda (generar iconos a partir del logo)               |
| `src/app/`                                          | Las páginas de la web. Cada carpeta es una dirección (`/kits`, …)   |
| `src/app/globals.css`                               | **Sistema de diseño**: colores, tipografías, radios y sombras       |
| `src/components/`                                   | Piezas reutilizables: botones, barra de navegación, pie, logo…      |
| `src/config/marca.ts`                               | Nombre, lema y enlaces del menú y del pie                           |
| `src/store/`                                        | El carrito y el robot del configurador (se guardan en el navegador) |
| `src/lib/compatibilidad/`                           | **Reglas del configurador** (avisos de compatibilidad)              |
| `src/lib/pagos/`, `src/lib/pedidos.ts`              | Pago (simulado; preparado para Stripe) y creación de pedidos        |
| `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts` | Inicio de sesión (Auth.js) y protección de las páginas de cuenta    |
| `src/lib/cursos.ts`, `src/lib/activacion.ts`        | Cursos del usuario, progreso y activación de códigos                |
| `src/lib/`, `src/types/`                            | Conexión a la base de datos, consultas, validaciones y utilidades   |
| `src/generated/`                                    | Código que crea Prisma automáticamente. No se edita a mano.         |

## Cómo cambiar…

### Los colores

Abre `src/app/globals.css` y cambia los valores dentro de `@theme`. Por ejemplo, para otro azul de acento,
cambia `--color-acento`. Puedes ver todos los colores en **http://localhost:3000/diseno**.

### El logo

1. Sustituye `imagenes/logo.png` por tu nuevo logo.
2. Ejecuta `npm run marca` (regenera las copias PNG, el favicon y los iconos).
3. La web usa `public/images/brand/logo.svg` y `logo-blanco.svg` (versión vectorial). Si tu nuevo logo es
   distinto, sustitúyelos también, o cambia en `src/config/marca.ts` las rutas a `logo-negro.png` y `logo-blanco.png`.

### El icono de la pestaña (favicon)

Edita `public/images/brand/monograma.svg` y ejecuta `npm run marca`.

### Los textos del menú y del pie

En `src/config/marca.ts`.

### Los productos (kits y componentes)

Los datos están en la carpeta `data/`:

- `data/componentes.json`: los 18 componentes (precio en euros, stock, voltaje, consumo, conector, pines…).
- `data/kits.json`: los 3 kits. En `componentes` se indica qué piezas lleva cada uno y cuántas.
  El kit con `"destacado": true` es el que sale en la portada.
- `data/cursos.json`: los cursos, con sus lecciones y ejercicios.

Después de cambiar algo, ejecuta `npm run db:seed` para guardarlo en la base de datos y recarga la página.
Si hay un error (por ejemplo, un precio escrito como texto), el seed te dirá en qué archivo y en qué línea está.

### Las reglas del configurador

El configurador (**http://localhost:3000/configurador**) avisa cuando las piezas no encajan.
Las reglas están en `src/lib/compatibilidad/reglas.ts` y son una lista de datos; no hace falta saber programar
para cambiarlas. Hay cuatro tipos:

- `necesita`: unas piezas necesitan otras (un motor necesita un driver, que mueve 2 motores).
- `maximo`: no más de X piezas de un tipo (una sola placa).
- `voltaje`: compara los voltios de una pieza con los de la placa o la batería.
- `capacidad`: pines de la placa o corriente de la batería, lo usado frente a lo que hay.

Cada regla tiene un `nivel` (`error`, `aviso` o `info`), un `titulo` y un `mensaje`. Las palabras entre llaves,
como `{piezas}` o `{usados}`, se rellenan solas. Con `sugerencia` (el slug de un componente) aparece un botón
para añadir esa pieza. Las reglas usan el campo `tipo` de cada componente de `data/componentes.json`
(`placa`, `motor-dc`, `servo`, `bateria`…). Si creas un tipo nuevo, añádelo también en las reglas que le afecten.

Los textos y los iconos de las categorías (Placas, Motores…) están en `src/config/categorias.ts`.

Para abrir el configurador con un kit ya cargado: `/configurador?kit=` seguido del slug del kit
(por ejemplo, `/configurador?kit=brazo-robotico`).

### La compra (pagos simulados y Stripe)

El recorrido es: **carrito** (`/carrito`) → **finalizar compra** (`/checkout`) → **confirmación** (`/pedido/…`).
Ahora mismo el pago es **simulado**: no hace falta tarjeta y no se cobra nada. Al pulsar «Pagar»:

1. El servidor vuelve a calcular los precios con la base de datos (nunca se fía de los del navegador).
   Si han cambiado, actualiza el carrito y te pide que lo revises.
2. Comprueba que hay stock, lo descuenta y guarda el pedido.
3. Por **cada kit** comprado crea un **código de activación único** (por ejemplo `VAL-7KQ2-M9XD`).
   Los componentes sueltos y los robots del configurador no llevan curso ni código.
4. La página de confirmación enseña la **tarjeta con el QR** tal y como iría impresa en la caja.
   El botón «Imprimir tarjetas» imprime solo las tarjetas.

El envío es gratis. Para **cobrar de verdad con Stripe**, sigue los pasos que hay escritos en
`src/lib/pagos/stripe.ts` y cambia en `.env` la línea `PAGOS_PROVEEDOR="simulado"` por `"stripe"`.
El resto de la web no hay que tocarlo.

Los QR apuntan a la dirección de `NEXT_PUBLIC_SITE_URL` (en `.env`). Cuando la web esté publicada, pon ahí
su dirección real para que los QR impresos funcionen.

### Las imágenes de los productos

Las ilustraciones de `public/images/componentes/` y `public/images/kits/` son de muestra.
Para poner una foto real, guárdala en la misma carpeta y cambia la ruta en el JSON
(por ejemplo, `"imagen": "/images/kits/brazo-robotico.jpg"`). Después, `npm run db:seed`.

### Los vídeos de los cursos

En `data/cursos.json`, cada lección tiene `"videoUrl": "PENDIENTE"`. Busca la palabra **PENDIENTE**
y sustitúyela por la dirección del vídeo. Después, `npm run db:seed`. Valen:

- YouTube: `https://www.youtube.com/watch?v=…` o `https://youtu.be/…`
- Vimeo: `https://vimeo.com/123456789`
- Un archivo de vídeo: guárdalo en `public/videos/` y escribe `/videos/leccion-1.mp4`

Mientras ponga `PENDIENTE`, la lección muestra el aviso «Estamos grabando este vídeo».

### Los ejercicios de los cursos

También en `data/cursos.json`, dentro de cada lección, en `ejercicios`:

- **Test**: `"tipo": "TEST"`, `enunciado`, `opciones` (lista de respuestas), `correcta` (la posición de la
  respuesta buena **empezando a contar en 0**) y `explicacion`.
- **Reto**: `"tipo": "RETO"`, `enunciado`, `pistas` (se descubren de una en una) y `solucion`.

La respuesta correcta y la solución nunca se envían al navegador antes de tiempo: las comprueba el servidor.

### Quién puede ver qué

- Las páginas de **Mis cursos** (`/cursos/…`) necesitan haber iniciado sesión. Si no, llevan a `/login`
  y después vuelven a donde ibas. La lista de rutas protegidas está en `src/auth.config.ts`.
- Cada usuario solo ve los cursos que ha activado con un código.

## Base de datos

En local se usa **SQLite**: toda la base de datos es un único archivo, `prisma/dev.db`, que no se sube a git.
La dirección está en `DATABASE_URL` del archivo `.env`.

Tablas principales: catálogo (`Componente`, `Kit`, `Curso`, `Leccion`, `Ejercicio`), compras
(`Pedido`, `LineaPedido`, `CodigoActivacion`) y cuentas (`Usuario`, `CursoUsuario` = cursos desbloqueados,
`ProgresoLeccion` y `ProgresoEjercicio`). Puedes verlas con `npm run db:studio`.
Las contraseñas se guardan **cifradas** con bcrypt: nadie puede leerlas, ni siquiera viendo la base de datos.

### Pasar a PostgreSQL (producción)

1. En `prisma/schema.prisma`, cambia `provider = "sqlite"` por `provider = "postgresql"`.
2. Instala el adaptador de PostgreSQL: `npm install @prisma/adapter-pg`.
3. En `src/lib/db.ts` y `prisma/seed.ts`, cambia el adaptador de SQLite por el de PostgreSQL
   (las instrucciones exactas están en el comentario de `src/lib/db.ts`).
4. Pon la URL de PostgreSQL en `DATABASE_URL`.
5. Borra la carpeta `prisma/migrations` y crea una migración nueva con `npm run db:migrate`
   (las migraciones de SQLite y PostgreSQL no son intercambiables). Después, `npm run db:seed`.
