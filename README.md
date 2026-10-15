# Valentia

Web de **Valentia**: kits de robótica y componentes, con cursos que se desbloquean con el QR de cada caja.

> Estado: **versión local completa** (las 6 fases terminadas) con **panel de administración** en `/admin`.
> Los pagos son simulados y el código está preparado para Stripe, PostgreSQL y guardar las fotos en la nube.
> Antes de publicarla, sigue la lista [Antes de publicar la web](#antes-de-publicar-la-web).

## Qué tiene la web

| Dirección                               | Qué es                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `/`                                     | Portada: kit estrella, una sección por kit, configurador y explicación del QR |
| `/kits`, `/kits/[kit]`                  | Listado de kits y ficha de cada uno (precio, piezas, temario del curso)       |
| `/componentes`                          | Componentes sueltos por categoría, con sus datos técnicos                     |
| `/configurador`                         | Monta tu robot pieza a pieza, con avisos de compatibilidad                    |
| `/carrito`, `/checkout`, `/pedido/[id]` | Carrito, compra simulada y confirmación con las tarjetas QR imprimibles       |
| `/login`, `/registro`                   | Iniciar sesión y crear cuenta                                                 |
| `/activar?codigo=…`                     | Lo que abre el QR de la caja: desbloquea el curso del kit                     |
| `/cursos`, `/cursos/[curso]/[lección]`  | Mis cursos: vídeos, tests, retos y progreso (necesita iniciar sesión)         |
| `/diseno`                               | Página interna con el sistema de diseño (colores, tipografías, botones)       |
| `/admin`                                | **Panel de administración** (solo administradores, ver más abajo)             |

## Tecnología

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 (SQLite en local, PostgreSQL
en producción) · Auth.js v5 (email y contraseña cifrada con bcrypt) · Zustand (carrito en el navegador) ·
Zod (validación) · qrcode · lucide-react (iconos) · ESLint + Prettier.

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
Con `npm run db:reset` vuelven a quedar sin usar (pero ese comando lo borra todo, ver más abajo).

## Panel de administración

El panel (**http://localhost:3000/admin**) sirve para gestionar la tienda y los cursos sin tocar código.
Tiene un diseño propio, más sencillo que el de la tienda, porque es una herramienta de trabajo.

### Quién puede entrar

Cada cuenta tiene un **rol**: `CLIENTE` (todas las que se crean en `/registro`) o `ADMIN`. Solo los ADMIN
pueden ver el panel; un cliente que escriba `/admin` ve la página de «no encontrado», y si no has iniciado
sesión te lleva al login. Todo se comprueba en el servidor, en cada página y en cada botón.

Para convertir una cuenta en administradora (tiene que existir antes: créala en `/registro`):

```bash
npm run admin -- tu@email.com            # le da el rol ADMIN
npm run admin -- tu@email.com --quitar   # se lo quita
npm run admin                            # dice quién es ADMIN ahora
```

El cambio vale al momento. El enlace «Panel de administración» del menú de tu cuenta aparece la próxima vez
que inicies sesión (mientras tanto, escribe `/admin` en la barra de direcciones).

### Qué se puede hacer

| Sección         | Qué hace                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Inicio**      | Usuarios, nuevos este mes, pedidos, kits vendidos, códigos activados, cursos más activos, últimos pedidos y registros |
| **Componentes** | Crear, editar, ocultar y borrar. Foto, precio, stock, categoría y datos técnicos para la compatibilidad               |
| **Kits**        | Crear y editar: piezas elegidas con un buscador, foto, descripción, precio, curso incluido, destacado                 |
| **Cursos**      | Cursos, lecciones (con ↑ ↓ para ordenarlas), vídeo, tests y retos, y progreso medio de los alumnos                    |
| **Códigos**     | Generar códigos en lote, imprimir sus tarjetas QR, ver quién usó cada uno y cuándo, desactivarlos                     |
| **Usuarios**    | Lista con buscador: email, fecha de registro, cursos activados y pedidos                                              |

Algunas reglas que conviene saber:

- **Los cambios se ven al momento** en la tienda y en el configurador.
- **Ocultar** un componente: deja de venderse suelto y desaparece del configurador, pero sigue dentro de sus kits.
  **Ocultar** un kit: deja de venderse, pero sus códigos QR siguen funcionando.
- **Borrar** pide siempre confirmación. No se puede borrar un componente que está dentro de un kit, ni un kit
  que ya tiene códigos o pedidos, ni un curso que va con un kit o que tiene alumnos: el panel te explica por qué
  y te propone ocultarlo. Los pedidos antiguos nunca cambian (guardan su propia copia de nombres y precios).
- La **dirección** (slug) de un componente, kit, curso o lección se elige al crearlo y ya no cambia.
- Cada kit va con **un curso** y cada curso con un solo kit. Para un kit nuevo, crea antes su curso.
- **Vídeos:** elige YouTube o Vimeo y pega el enlace o solo el identificador (`dQw4w9WgXcQ`, `76979871`).
  Para añadir otro servicio, crea un archivo en `src/lib/video/proveedores/` (ver `tipos.ts`) y añádelo a la lista.
- **Códigos:** en «Códigos», elige el kit y la cantidad (por ejemplo 50) y pulsa «Generar códigos». Se abre la
  página de las tarjetas: pulsa «Imprimir» (4 tarjetas por hoja A4) y mete una en cada caja. Los pedidos de la
  web siguen creando además su propio código. **Desactivar** un código hace que ya no sirva; si alguien ya lo
  había activado, conserva su curso. Se puede reactivar.
- **Fotos:** JPG, PNG o WebP de hasta 5 MB. Se reducen y se convierten a WebP solas, y se guardan en la carpeta
  `subidas/` del proyecto (no se sube a git: haz copia de seguridad de ella junto con la base de datos).

### La base de datos manda

La base de datos es la **fuente de verdad**: el catálogo y los cursos se cambian desde el panel. Los JSON de
`data/` son solo los **datos iniciales**: `npm run db:seed` los carga únicamente si la base de datos está vacía,
y si ya hay catálogo no toca nada. `npm run db:reset` lo **borra todo** (catálogo, pedidos, cuentas, también
la tuya de administrador) y vuelve a cargar los datos iniciales: después tendrás que registrarte otra vez y
ejecutar `npm run admin -- tu@email.com`.

### Otros comandos

| Comando              | Para qué sirve                                                             |
| -------------------- | -------------------------------------------------------------------------- |
| `npm run build`      | Prepara la versión final y optimizada de la web                            |
| `npm run start`      | Arranca la versión final (después de `build`)                              |
| `npm run lint`       | Revisa el código en busca de errores                                       |
| `npm run format`     | Ordena y da formato a todo el código                                       |
| `npm run marca`      | Regenera el favicon, los iconos y las versiones PNG del logo               |
| `npm run admin`      | Da o quita el rol de administrador (ver «Panel de administración»)         |
| `npm run db:seed`    | Carga `data/*.json`, solo si la base de datos está vacía                   |
| `npm run db:reset`   | **Lo borra todo** y crea la base de datos de nuevo con los datos iniciales |
| `npm run db:migrate` | Aplica cambios de `prisma/schema.prisma` a la base de datos                |
| `npm run db:studio`  | Abre un panel en el navegador para ver y editar la base de datos           |

## Qué hay en cada carpeta

| Carpeta                                             | Contenido                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| `imagenes/`                                         | Tus originales (logo.png). No se modifican nunca.                   |
| `public/images/brand/`                              | Logo para la web (SVG y PNG) e iconos                               |
| `public/images/componentes/`, `public/images/kits/` | Imágenes de productos (ilustraciones de muestra en SVG)             |
| `data/`                                             | **Datos iniciales**: componentes, kits y cursos (archivos JSON)     |
| `subidas/`                                          | Fotos subidas desde el panel (no se sube a git)                     |
| `prisma/`                                           | Base de datos: esquema, migraciones, seed y el archivo `dev.db`     |
| `scripts/`                                          | Programas de ayuda (iconos a partir del logo, hacer administrador)  |
| `src/app/admin/`, `src/components/admin/`           | **Panel de administración**: páginas, acciones y sus piezas         |
| `src/lib/admin/`                                    | Consultas del panel (estadísticas, códigos, progreso…)              |
| `src/lib/almacenamiento/`                           | Dónde se guardan las fotos (local ahora; preparado para la nube)    |
| `src/lib/video/`                                    | Servicios de vídeo de las lecciones (YouTube, Vimeo…)               |
| `src/app/`                                          | Las páginas de la web. Cada carpeta es una dirección (`/kits`, …)   |
| `src/app/globals.css`                               | **Sistema de diseño**: colores, tipografías, radios y sombras       |
| `src/components/`                                   | Piezas reutilizables: botones, barra de navegación, pie, logo…      |
| `src/config/marca.ts`                               | Nombre, lema y enlaces del menú y del pie                           |
| `src/store/`                                        | El carrito y el robot del configurador (se guardan en el navegador) |
| `src/lib/compatibilidad/`                           | **Reglas del configurador** (avisos de compatibilidad)              |
| `src/lib/pagos/`, `src/lib/pedidos.ts`              | Pago (simulado; preparado para Stripe) y creación de pedidos        |
| `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts` | Inicio de sesión (Auth.js) y protección de las páginas de cuenta    |
| `src/lib/cursos.ts`, `src/lib/activacion.ts`        | Cursos del usuario, progreso y activación de códigos                |
| `src/lib/limite.ts`                                 | Límite de intentos (login, registro y activación)                   |
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

Desde el panel: **http://localhost:3000/admin/componentes** y **/admin/kits**. El kit marcado como
«destacado» es el que sale en la portada. Los JSON de `data/` ya solo sirven como datos iniciales
(ver «La base de datos manda»).

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

### Las imágenes, los vídeos y los ejercicios

Todo desde el panel: la foto en la ficha de cada componente o kit, y el vídeo, los tests y los retos en
cada lección de **/admin/cursos**. Mientras una lección no tenga vídeo, muestra el aviso «Estamos grabando
este vídeo». La respuesta correcta de los tests y la solución de los retos nunca se envían al navegador
antes de tiempo: las comprueba el servidor.

### Quién puede ver qué

- Las páginas de **Mis cursos** (`/cursos/…`) y del **panel** (`/admin/…`) necesitan haber iniciado sesión. Si no, llevan a `/login`
  y después vuelven a donde ibas. La lista de rutas protegidas está en `src/auth.config.ts`.
- Cada usuario solo ve los cursos que ha activado con un código.
- El panel, además, solo lo pueden usar las cuentas con rol ADMIN (`src/lib/sesion.ts`: `exigirAdmin` y `exigirAdminEnAccion`).

### Los límites de intentos

Para que nadie pueda probar miles de contraseñas o códigos seguidos, hay un máximo de intentos en
`src/lib/limite.ts` (por ejemplo, 10 inicios de sesión fallidos cada 15 minutos). Cambia los números en `LIMITES`.
Se guardan en la memoria del servidor, así que se reinician al reiniciarlo.

## Calidad

Antes de cada versión se ejecuta `npm run lint` (revisa el código) y `npm run build` (compila la web); los dos
deben terminar sin errores. En la fase 6 se revisaron además todas las páginas, en móvil (390 px) y en ordenador:

- **Accesibilidad:** sin problemas en la auditoría automática (axe-core). Se puede navegar con teclado, hay
  enlace «Saltar al contenido», los formularios tienen etiquetas y mensajes de error que leen los lectores de
  pantalla, y las animaciones se desactivan si el sistema tiene activado «reducir movimiento».
- **Móvil:** ninguna página se sale por los lados.
- **Rendimiento:** cada página descarga unos 160 KB de JavaScript y menos de 310 KB en total. Las páginas de la
  tienda se generan por adelantado (cargan al instante).
- **Seguridad:** contraseñas cifradas, sesión en cookie cifrada, precios recalculados en el servidor, respuestas
  de los tests y soluciones que no llegan al navegador antes de tiempo, límite de intentos y redirecciones
  solo dentro de la web.

## Antes de publicar la web

Esta versión está pensada para tu ordenador. Para ponerla en internet:

1. **Base de datos:** pasa a PostgreSQL (ver [Pasar a PostgreSQL](#pasar-a-postgresql-producción)).
2. **Variables de `.env`** en el servidor:
   - `AUTH_SECRET`: una clave nueva y secreta (`npx auth secret`). No reutilices la de tu ordenador.
   - `NEXT_PUBLIC_SITE_URL`: la dirección real de la web (los QR impresos apuntan aquí).
   - `DATABASE_URL`: la de PostgreSQL.
3. **Pagos reales:** activa Stripe (ver `src/lib/pagos/stripe.ts`) y quita los textos de «pago simulado»
   (están en `src/components/compra/FormularioCheckout.tsx` y en el pie de página).
4. **Datos de prueba:** no ejecutes `npm run db:seed` en producción. Crea los productos y cursos reales desde
   el panel, y **no** el usuario de prueba ni los códigos `VAL-PRUE-…`.
5. **Administrador:** regístrate en la web publicada y ejecuta allí `npm run admin -- tu@email.com`.
6. **Fotos en la nube:** el disco de muchos servidores se borra en cada despliegue. Sigue los pasos de
   `src/lib/almacenamiento/nube.ts` (S3, R2 o similar) y pon `ALMACEN_PROVEEDOR="nube"` en `.env`.
   Copia a la nube las fotos que tengas en `subidas/`.
7. **Pendiente para más adelante** (necesitan un servicio de envío de emails): «¿Olvidaste tu contraseña?» y
   enviar la confirmación del pedido por email. También se podría unir cada pedido a la cuenta de quien lo hace
   (hoy la página `/pedido/…` la ve quien tenga su dirección, que es muy difícil de adivinar).
8. Si la web llega a funcionar en **varios servidores** a la vez, el límite de intentos tendrá que guardarse en un
   sitio compartido (por ejemplo Redis) en lugar de en memoria (ver `src/lib/limite.ts`).

## Actualizar las librerías

`npm outdated` muestra qué librerías tienen versiones nuevas. Las actualizaciones pequeñas (por ejemplo,
de 16.4.0 a 16.4.1) suelen ser seguras: después ejecuta `npm run lint` y `npm run build`. **No** actualices todavía
a Prisma 8, ESLint 10 ni TypeScript 7: son versiones nuevas que aún no son compatibles con el resto del proyecto.

`npm audit` avisa de algunas vulnerabilidades en herramientas de desarrollo (ESLint y la línea de comandos de
Prisma). No afectan a la web que ven los visitantes, y su «arreglo automático» bajaría a versiones antiguas que
romperían el proyecto: lo correcto es esperar a que publiquen la corrección.

## Base de datos

En local se usa **SQLite**: toda la base de datos es un único archivo, `prisma/dev.db`, que no se sube a git.
La dirección está en `DATABASE_URL` del archivo `.env`.

Tablas principales: catálogo (`Componente`, `Kit`, `Curso`, `Leccion`, `Ejercicio`), compras
(`Pedido`, `LineaPedido`, `CodigoActivacion`, `LoteCodigos`) y cuentas (`Usuario` con su `rol`, `CursoUsuario` = cursos desbloqueados,
`ProgresoLeccion` y `ProgresoEjercicio`). Puedes verlas con `npm run db:studio`.
Las contraseñas se guardan **cifradas** con bcrypt: nadie puede leerlas, ni siquiera viendo la base de datos.

### Pasar a PostgreSQL (producción)

1. En `prisma/schema.prisma`, cambia `provider = "sqlite"` por `provider = "postgresql"`.
2. Instala el adaptador de PostgreSQL: `npm install @prisma/adapter-pg`.
3. En `src/lib/db.ts`, `prisma/seed.ts` y `scripts/hacer-admin.ts`, cambia el adaptador de SQLite por el de PostgreSQL
   (las instrucciones exactas están en el comentario de `src/lib/db.ts`).
4. Pon la URL de PostgreSQL en `DATABASE_URL`.
5. Borra la carpeta `prisma/migrations` y crea una migración nueva con `npm run db:migrate`
   (las migraciones de SQLite y PostgreSQL no son intercambiables). Después, `npm run db:seed`.
