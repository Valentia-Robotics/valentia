# Valentia

Web de **Valentia**: kits de robótica y componentes, con cursos que se desbloquean con el QR de cada caja.

> Estado: **preparada para el lanzamiento** (fase de lanzamiento terminada, ver `INFORME.md`).
> Funciona entera en tu ordenador con **pagos de prueba**. Para publicarla hay que poner claves de
> Stripe, una base de datos de producción en MongoDB Atlas, un proveedor de correo y revisar los textos
> legales: sigue la lista [Antes de publicar la web](#antes-de-publicar-la-web) y la guía `DESPLIEGUE.md`.

## Qué tiene la web

| Dirección                              | Qué es                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/`                                    | Portada: robot 3D que se despieza al hacer scroll, cómo funciona, kits, configurador y QR |
| `/kits`, `/kits/[kit]`                 | Listado de kits y ficha de cada uno (precio, piezas, temario del curso)                   |
| `/componentes`                         | Componentes sueltos por categoría, con sus datos técnicos                                 |
| `/configurador`                        | Monta tu robot pieza a pieza, con avisos de compatibilidad                                |
| `/carrito`, `/checkout`                | Carrito y compra en dos pasos: datos de envío → pago (Stripe o pago de prueba)            |
| `/pedido/[id]`                         | Estado del pedido, resumen con IVA y tarjetas QR (solo su dueño o con el enlace privado)  |
| `/login`, `/registro`                  | Iniciar sesión y crear cuenta                                                             |
| `/verificar`, `/recuperar`             | Código de 6 cifras por email y «¿Olvidaste tu contraseña?»                                |
| `/cuenta`, `/cuenta/pedidos`           | Mi cuenta: pedidos, direcciones guardadas, dispositivos, contraseña                       |
| `/activar?codigo=…`                    | Lo que abre el QR de la caja: desbloquea el curso del kit                                 |
| `/cursos`, `/cursos/[curso]/[lección]` | Mis cursos: vídeo, retos y progreso                                                       |
| `/cursos/[curso]/[lección]/test`       | Test de la lección, pregunta a pregunta (se desbloquea al terminar el vídeo)              |
| `/legal/…`                             | Aviso legal, privacidad, cookies, condiciones de venta y devoluciones (**borradores**)    |
| `/admin`                               | **Panel de administración** (solo administradores, ver más abajo)                         |
| `/diseno`                              | Página interna con el sistema de diseño (colores, tipografías, botones)                   |
| `/dev/correos`                         | Solo con `npm run dev`: los correos que la web «habría enviado»                           |

## Tecnología

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 6 con **MongoDB Atlas**
(Prisma 7 todavía no admite MongoDB) · Auth.js v5 (email y contraseña, verificación con código por email) ·
Stripe (Payment Element) · three.js (robot 3D) · Zustand (carrito y cookies en el navegador) ·
Zod (validación) · qrcode · lucide-react (iconos) · Vitest y Playwright (pruebas) · ESLint + Prettier.

## Cómo arrancar el proyecto

Necesitas tener instalado [Node.js](https://nodejs.org) 22 o superior (y Google Chrome para las pruebas),
y una base de datos de desarrollo en **MongoDB Atlas** (ver «Base de datos»): su dirección va en
`DATABASE_URL` del archivo `.env`.

```bash
npm install        # descarga las librerías (solo la primera vez)
npm run setup      # crea las colecciones y carga los datos de prueba (solo la primera vez)
npm run dev        # arranca la web en modo desarrollo
```

Abre **http://localhost:3000** en el navegador. Cada vez que guardes un archivo, la página se actualiza sola.
Para pararla, pulsa `Ctrl + C` en la terminal.

Si es la primera vez y no tienes archivo `.env`, copia `.env.example` como `.env` **antes** de `npm run setup`
y genera la clave secreta con `npx auth secret` (o pon en `AUTH_SECRET` un texto largo y aleatorio).

### Cuenta y códigos de prueba

El seed crea un **usuario de prueba**, con el email ya verificado (solo para tu ordenador):

| Email                  | Contraseña   |
| ---------------------- | ------------ |
| `prueba@valentia.test` | `robots2026` |

**Códigos de activación de prueba**: `VAL-PRUE-CAR2`, `VAL-PRUE-CAR3` (coche), `VAL-PRUE-BRZ2`,
`VAL-PRUE-BRZ3` (brazo), `VAL-PRUE-MET2`, `VAL-PRUE-MET3` (estación). Ábrelos así:
**http://localhost:3000/activar?codigo=VAL-PRUE-CAR2**. Cada navegador nuevo te pedirá un código por
email: lo verás en **http://localhost:3000/dev/correos**.

## Configuración del negocio

Todo lo que puedes querer cambiar sin tocar código está en **`src/config/tienda.ts`**:

- **Zona de envío**: solo Comunidad Valenciana (códigos postales que empiezan por **03**, **46** y **12**).
  Si alguien escribe otro código postal, el checkout le muestra un mensaje amable.
- **Gastos de envío**: 4,95 €; **gratis desde 50 €** (valores provisionales).
- **IVA**: 21 %, incluido en todos los precios. Se desglosa en el carrito, el checkout, el pedido y los correos.
- **Datos de la empresa**: razón social, NIF, dirección, email… Ahora son marcadores como `[RAZÓN SOCIAL]`
  y `[NIF]`: **rellénalos antes de publicar** (salen en las páginas legales y en los correos).

Los cálculos (envío, total, base imponible e IVA) están en `src/lib/precios.ts` y los usan igual el
navegador, el servidor y los correos.

## La compra y los pagos

El recorrido es **carrito** → **checkout** (1. datos de envío, 2. pago) → **página del pedido**.

- Se puede comprar **con cuenta** (se rellenan sus direcciones guardadas y el pedido sale en «Mi cuenta»)
  o **como invitado** (pidiendo el email).
- El servidor **recalcula siempre el precio** con la base de datos y **reserva el stock** al crear el
  pedido (nunca queda en negativo). Si el pago no llega en **60 minutos**, el pedido se cancela y el
  stock vuelve al almacén (`MINUTOS_RESERVA` en `src/lib/pedidos.ts`).
- Al **confirmarse el pago**: el pedido pasa a «Pagado», se crea un código de activación por cada kit
  y se envía el **correo de confirmación** con el resumen y el IVA desglosado.
- Para comprar hay que aceptar las condiciones de venta (enlazadas en el checkout).

### Pago de prueba (sin Stripe)

Si en `.env` no hay claves de Stripe, el checkout muestra el botón **«Confirmar pago de prueba»**,
claramente marcado y **sin campos de tarjeta**. Hace lo mismo que un pago real confirmado, sin cobrar.
En la web publicada (`npm start`) solo funciona si además pones `PERMITIR_PAGO_SIMULADO="si"`.

### Pagos con Stripe (claves de PRUEBA)

Con Stripe, la tarjeta se escribe en el formulario oficial de Stripe (**Payment Element**) dentro de la
web: sus datos van **directamente a Stripe** y nunca pasan por nuestro servidor. El pedido **solo** se
marca como pagado cuando lo confirma el **webhook** de Stripe (`/api/pagos/stripe`), que comprueba la
firma y no procesa dos veces el mismo aviso.

Para probarlo en tu ordenador:

1. Crea una cuenta en [stripe.com](https://stripe.com) y, en **modo de prueba**, copia las claves de
   _Desarrolladores → Claves de API_ en `.env`:
   ```bash
   STRIPE_SECRET_KEY="sk_test_…"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_…"
   ```
2. Instala la [CLI de Stripe](https://docs.stripe.com/stripe-cli), inicia sesión y deja abierta esta
   orden, que reenvía los avisos de Stripe a tu ordenador:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/pagos/stripe
   ```
   Copia el secreto que te da (`whsec_…`) en `.env` como `STRIPE_WEBHOOK_SECRET` y reinicia `npm run dev`.
3. Compra algo y paga con una **tarjeta de prueba** (cualquier fecha futura, cualquier CVC y código postal):

| Tarjeta               | Qué pasa                                               |
| --------------------- | ------------------------------------------------------ |
| `4242 4242 4242 4242` | Pago correcto                                          |
| `4000 0025 0000 3155` | Pide autenticación (3D Secure): acéptala en la ventana |
| `4000 0000 0000 9995` | Rechazada por fondos insuficientes                     |
| `4000 0000 0000 0002` | Rechazada                                              |

Verás «Estamos confirmando tu pago» unos segundos y, cuando llega el webhook, «¡Gracias!». En la
terminal de `stripe listen` aparecen los avisos. Por seguridad, la web **rechaza las claves reales**
(`sk_live_…`) salvo que pongas `STRIPE_PERMITIR_CLAVES_REALES="si"` (solo al publicar).

## Cursos: el test después del vídeo

En cada lección, el botón **«Hacer el test»** está bloqueado hasta que el vídeo llega al final. Se
detecta con las API oficiales: **YouTube IFrame API**, **Vimeo Player SDK** y el evento `ended` de los
vídeos `.mp4/.webm`. El test se hace en su propia pantalla, **pregunta a pregunta**; al terminar se ve
la puntuación, la explicación de cada respuesta y los botones para **repetirlo** o **volver a ver el
vídeo**. El resultado se guarda (último, mejor e intentos) y **aprobar** (la mitad o más) marca la
lección como completada. Las lecciones sin vídeo todavía permiten hacer el test directamente.

Los vídeos de YouTube y Vimeo ponen cookies propias, así que **solo se cargan si se aceptan** en el
banner de cookies (si no, se ve un aviso con «Aceptar y ver el vídeo»).

## Verificación por email

Para proteger las cuentas, la web envía **códigos de 6 cifras** por email: al **registrarse**, al
entrar desde un **dispositivo nuevo** (que pasa a ser de confianza 30 días, 7 para administradores) y
en **¿Olvidaste tu contraseña?**. Los códigos caducan a los 10 minutos, sirven una vez y admiten 5
intentos; como mucho se envían 5 por hora a cada email. Las reglas están en `src/lib/verificacion/reglas.ts`.

Con `npm run dev` **no se envía ningún correo de verdad**: aparecen en la terminal y en
**http://localhost:3000/dev/correos** (esa página no existe en la web publicada).

### Enviar correos de verdad (al publicar)

El envío está en `src/lib/correo` (el resto de la web solo usa `enviarCorreo()`). Está preparado
[Resend](https://resend.com): crea una cuenta, verifica tu dominio, crea una clave y pon en el `.env`
del servidor `CORREO_PROVEEDOR="resend"`, `RESEND_API_KEY="re_…"` y `CORREO_REMITENTE="Valentia <hola@valentiarobotics.com>"`.
Las plantillas (código, nuevo dispositivo, pedido confirmado, pedido enviado…) están en `src/lib/correo/plantillas.ts`.

## Panel de administración

El panel (**http://localhost:3000/admin**) sirve para gestionar la tienda y los cursos sin tocar código.

### Quién puede entrar

Solo las cuentas con rol `ADMIN` (las demás ven «no encontrado»). Todo se comprueba en el servidor.

```bash
npm run admin -- tu@email.com            # le da el rol ADMIN (la cuenta tiene que existir)
npm run admin -- tu@email.com --quitar   # se lo quita
npm run admin                            # dice quién es ADMIN ahora
```

### Qué se puede hacer

| Sección         | Qué hace                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inicio**      | Usuarios, pedidos, kits vendidos, códigos activados, cursos más activos, últimos pedidos                                                                                                                             |
| **Pedidos**     | Filtrar por estado, buscar, ver cada pedido y cambiar su estado: Pagado → **Preparando** → **Enviado** (con número de seguimiento; el cliente recibe un correo) → **Entregado**, o **Cancelado** (devuelve el stock) |
| **Componentes** | Crear, editar, ocultar y borrar. Foto, precio, stock, categoría y datos técnicos                                                                                                                                     |
| **Kits**        | Piezas con buscador, foto, descripción, precio, curso incluido, destacado                                                                                                                                            |
| **Cursos**      | Lecciones (ordenables), vídeo, tests y retos, y progreso de los alumnos                                                                                                                                              |
| **Códigos**     | Generar códigos en lote, imprimir sus tarjetas QR o descargarlas para láser (.zip de SVG), desactivarlos                                                                                                             |
| **Usuarios**    | Lista con buscador: email, registro, cursos activados y pedidos                                                                                                                                                      |
| **Reseñas**     | Opiniones de los kits (estrellas y comentario): ocultar, volver a publicar o borrar                                                                                                                                  |

Algunas reglas: un pedido solo pasa a «Pagado» con el pago confirmado (nunca desde el panel). Si
cancelas un pedido ya cobrado con Stripe, **devuelve el dinero desde el panel de Stripe** (la ficha del
pedido tiene un enlace). Ocultar un componente o un kit lo quita de la tienda sin borrarlo. Borrar algo
con dependencias se bloquea y se propone ocultarlo. Las fotos se reducen y se convierten a WebP solas.
Reseñas: solo puede opinar quien ha activado el código QR de ese kit; salen al momento en la ficha
(y sus estrellas, en Google). Las reglas están en `src/config/resenas.ts`.

### La base de datos manda

La base de datos es la **fuente de verdad**. Los JSON de `data/` solo se cargan con `npm run db:seed`
si la base de datos está vacía. `npm run db:reset` **lo borra todo** (también tu cuenta de administrador).

## Cookies y páginas legales

- **Banner de cookies**: «Rechazar» y «Aceptar» con el mismo peso; «Configurar» por categorías. Solo hay
  cookies necesarias (sesión, carrito, pago) y, con permiso, las de los vídeos de YouTube/Vimeo. No hay
  analítica ni publicidad. Se puede cambiar en «Configurar cookies» (pie de página).
- **Páginas legales** en `src/app/(tienda)/legal/`: aviso legal, privacidad (RGPD), cookies, condiciones
  de venta y devoluciones (desistimiento de 14 días, con formulario). Todas llevan el aviso
  **«BORRADOR — pendiente de revisión por un profesional»** y marcadores `[REVISAR…]`. Cuando un abogado
  las apruebe, quita el aviso con `borrador={false}` en `PaginaLegal`.

## Seguridad

Resumen en **`SEGURIDAD.md`**: autorización en el servidor en cada página y acción, validación con Zod,
límite de intentos guardado en la base de datos (sirve con varios servidores), cabeceras de seguridad
(CSP compatible con Stripe y los vídeos, HSTS…), cookies seguras, subida de fotos controlada, sin
secretos en git ni en el navegador, y lo que queda pendiente para producción.

## Pruebas automáticas

```bash
npm test             # pruebas unitarias (Vitest): precios, envíos, IVA, compatibilidad, validaciones
npm run test:e2e     # pruebas con navegador (Playwright): el recorrido completo de una persona
```

`npm run test:e2e` usa el **Chrome** instalado, **su propia base de datos** (la tuya acabada en `_e2e`, por
ejemplo `valentia_e2e`, en el mismo clúster de Atlas; la crea de cero cada vez) y **su propia copia** de la web compilada en http://localhost:3100, así que no toca tus
datos ni tu `npm run dev`. Recorre: registro → código por correo → configurador → carrito → pago de
prueba → activación del código → vídeo → test; comprueba la seguridad básica, el SEO y la zona de envío; y
**recorre todas las páginas** siguiendo los enlaces (tienda, cuenta y panel: errores de consola, errores del
servidor, enlaces e imágenes rotas) y las principales en un móvil (desbordes). Tarda unos minutos (compila la
web y Atlas está en Internet).

## Otros comandos

| Comando                         | Para qué sirve                                                             |
| ------------------------------- | -------------------------------------------------------------------------- |
| `npm run build`                 | Prepara la versión final y optimizada de la web                            |
| `npm run start`                 | Arranca la versión final (después de `build`)                              |
| `npm run lint`                  | Revisa el código en busca de errores                                       |
| `npm run format`                | Ordena y da formato a todo el código                                       |
| `npm run marca`                 | Regenera el favicon, los iconos y las versiones PNG del logo               |
| `npm run admin`                 | Da o quita el rol de administrador                                         |
| `npm run prod:admin`            | Crea o asciende el administrador (Shell de Render; contraseña oculta)      |
| `npm run catalogo:exportar`     | Guarda el catálogo de `valentia-dev` en `data/catalogo/` (ver DESPLIEGUE)  |
| `npm run seed:prod`             | Solo crea lo que falta de `data/catalogo/` (`-- --dry-run`: simula)        |
| `npm run predeploy:prod`        | Pre-Deploy de Render: `db push` sin pérdida de datos + `seed:prod`         |
| `npm run db:check`              | Prueba la conexión con MongoDB y explica el error                          |
| `npm run db:push`               | Aplica `prisma/schema.prisma` a la base de datos (colecciones e índices)   |
| `npm run db:seed`               | Catálogo (si no hay) + usuario y códigos de prueba. **Solo desarrollo**    |
| `npm run db:catalogo`           | Solo el catálogo inicial de `data/*.json`, si no hay ninguno               |
| `npm run db:reset`              | **Lo borra todo** y crea la base de datos de nuevo con los datos iniciales |
| `npm run db:copia`              | Copia de seguridad de toda la base de datos en `copias/`                   |
| `npm run db:restaurar`          | Restaura una copia (ver «Copias de seguridad»)                             |
| `npm run db:studio`             | Abre un panel en el navegador para ver y editar la base de datos           |
| `npm run fotos:nube`            | Sube a la nube las fotos de `subidas/` y actualiza sus direcciones         |
| `npm test` / `npm run test:e2e` | Pruebas automáticas (ver arriba)                                           |

## Qué hay en cada carpeta

| Carpeta               | Contenido                                                                         |
| --------------------- | --------------------------------------------------------------------------------- |
| `imagenes/`           | Tus originales (logo.png). No se modifican nunca.                                 |
| `public/images/`      | Logo, iconos e ilustraciones de muestra                                           |
| `data/`               | **Datos iniciales**: componentes, kits y cursos (JSON)                            |
| `prisma/`             | Esquema (MongoDB), catálogo inicial (`catalogo.ts`) y seed de desarrollo          |
| `scripts/`            | Programas de ayuda (marca, admin, catálogo, copias, fotos a la nube, pruebas)     |
| `copias/`             | Copias de seguridad de la base de datos (no se sube a git: datos personales)      |
| `e2e/`                | Pruebas con navegador (Playwright)                                                |
| `subidas/`            | Fotos subidas desde el panel (no se sube a git)                                   |
| `src/app/`            | Las páginas. Cada carpeta es una dirección (`/kits`, `/checkout`…)                |
| `src/app/globals.css` | **Sistema de diseño**: colores, tipografías, radios y sombras                     |
| `src/components/`     | Piezas reutilizables (portada 3D, compra, cursos, panel, legal…)                  |
| `src/config/`         | `tienda.ts` (negocio), `marca.ts` (menús), `estadosPedido.ts`, `categorias.ts`    |
| `src/lib/`            | Base de datos, pedidos, precios, pagos (Stripe), correo, límites, almacenamiento… |
| `src/store/`          | Carrito, robot del configurador y consentimiento de cookies (en el navegador)     |

## Cómo cambiar…

- **Los colores**: `src/app/globals.css` (`@theme`). Se ven en **http://localhost:3000/diseno**.
- **El logo**: sustituye `imagenes/logo.png`, ejecuta `npm run marca` y, si cambia el dibujo, también
  `public/images/brand/logo.svg` y `logo-blanco.svg`.
- **Los textos del menú y del pie**: `src/config/marca.ts`.
- **Envíos, IVA y datos de la empresa**: `src/config/tienda.ts`.
- **Los productos y los cursos**: desde el panel.
- **Las reglas del configurador**: `src/lib/compatibilidad/reglas.ts` (son datos: `necesita`, `maximo`,
  `voltaje` y `capacidad`, con su nivel, título y mensaje).
- **El robot de la portada**: piezas y textos en `src/components/portada/piezasRobot.ts`; la escena 3D en
  `escenaRobot.ts`. El 3D solo se carga en ordenadores capaces; en móviles, equipos lentos o con
  «reducir movimiento» se ve un dibujo SVG ligero.
- **Los límites de intentos**: `LIMITES` en `src/lib/limite.ts`.

## Base de datos

Se usa **MongoDB Atlas** (en la nube) con Prisma 6. Colecciones principales: catálogo (`Componente`, `Kit`,
`Curso`, `Leccion`, `Ejercicio`), compras (`Pedido`, `LineaPedido`, `Direccion`, `CodigoActivacion`,
`LoteCodigos`, `EventoStripe`), cuentas (`Usuario`, `CursoUsuario`, `ProgresoLeccion`, `ProgresoEjercicio`,
`VideoVisto`, `ResultadoTest`) y seguridad (`Verificacion`, `EnvioCodigo`, `DispositivoConfianza`,
`LimiteIntento`). Las contraseñas se guardan cifradas con bcrypt y el dinero en céntimos (números enteros).

### Tu base de datos de desarrollo

1. En [cloud.mongodb.com](https://cloud.mongodb.com), dentro del proyecto de desarrollo, entra en
   **Database Access** y crea un usuario para ti; en **Network Access** añade tu IP (**Add Current IP Address**).
2. **Connect → Drivers** te da la dirección: `mongodb+srv://usuario:contraseña@cluster….mongodb.net/?…`.
   Escribe el nombre de la base de datos justo antes del `?`. Si el equipo comparte clúster, que cada persona
   use la suya: `/valentia_ana?…`, `/valentia_luis?…` (las pruebas usarán `valentia_ana_e2e`…).
3. Pégala en `DATABASE_URL` de tu `.env` y ejecuta `npm run setup`.

La base de datos es la fuente de verdad: `npm run db:seed` solo carga `data/*.json` si no hay catálogo.

### Cuándo ejecutar `npm run db:push`

MongoDB **no usa migraciones**: `prisma db push` crea las colecciones y los índices (por ejemplo, que no
haya dos cuentas con el mismo email) a partir de `prisma/schema.prisma`. Hay que ejecutarlo:

- **la primera vez** en cada base de datos (`npm run setup` ya lo hace);
- **cada vez que cambie `prisma/schema.prisma`** (por ejemplo, al traer una rama que lo modifica). Si el
  cambio puede borrar datos, Prisma avisa y no hace nada: no añadas `--accept-data-loss` sin preguntar;
- **en producción** se ejecuta solo en cada despliegue (ver `DESPLIEGUE.md`).

Después de `db:push`, si `npm run dev` estaba en marcha, reinícialo. Los pull requests que cambian el
esquema lo indican en «Cambios en la base de datos».

### Detalles de MongoDB que hay que conocer al programar

- **Ids**: cada documento tiene un `ObjectId` (24 caracteres hexadecimales). Un id que llega de la dirección
  o de un formulario se comprueba con `esId()` (`src/lib/ids.ts`) antes de consultar: si no, Prisma da error.
- **Campos opcionales**: al crear un documento se guardan como `null` los que no se rellenan
  (`src/lib/nulos.ts`); sin esto, filtros como `usadoEn: null` no encontrarían nada. Si añades un campo
  opcional al esquema, añádelo a `OPCIONALES` (`npm test` avisa si se te olvida). Las creaciones anidadas
  (`kit.create({ codigos: { create } })`) no pasan por ahí: crea esos documentos por separado.
- **Transacciones**: usa `transaccion()` de `src/lib/db.ts` (reintenta sola si choca con otra a la vez).
- **Búsquedas de texto**: `textoContiene()` (`src/lib/busqueda.ts`) no distingue mayúsculas.

### Copias de seguridad

El plan gratuito **M0** de Atlas **no hace copias automáticas**, así que hay que hacerlas a mano:

```bash
npm run db:copia                                              # guarda copias/valentia_AAAA-MM-DD_HH-MM.json
npm run db:restaurar -- copias/archivo.json                   # solo enseña qué haría
npm run db:restaurar -- copias/archivo.json --si              # restaura en una base de datos vacía
npm run db:restaurar -- copias/archivo.json --si --reemplazar # SUSTITUYE lo que haya
```

Copian la base de datos de `DATABASE_URL`. Para la de **producción**, desde tu ordenador (PowerShell), con la
dirección de producción y tu IP añadida temporalmente en Atlas (ver `DESPLIEGUE.md` §7):

```powershell
$env:DATABASE_URL="<dirección de producción>"
npm run db:copia
Remove-Item Env:DATABASE_URL
```

**Cada cuánto**: mientras haya pocos pedidos, **una vez por semana** y **siempre antes** de un cambio del
esquema, de una importación o de cambios grandes en el panel. En cuanto haya ventas de verdad, **a diario**
(o pasa a un plan de Atlas con copias automáticas). Guarda las copias **fuera del ordenador** (en un sitio
privado: tienen datos personales de los clientes) y conserva al menos las 4 últimas semanales y una por mes.
Prueba de vez en cuando a restaurar una en una base de datos de pruebas: una copia que no se puede
restaurar no sirve.

### Fotos en la nube (producción)

El disco del servidor (también en Render) se borra en cada despliegue, así que en producción las fotos del panel
deben ir a un almacén compatible con S3 (**Cloudflare R2**, Amazon S3, Backblaze B2…):

1. Crea un _bucket_ con acceso público de lectura y una clave con permiso solo para él.
2. En `.env` del servidor: `ALMACEN_PROVEEDOR="nube"` y las variables `ALMACEN_ENDPOINT`,
   `ALMACEN_REGION`, `ALMACEN_BUCKET`, `ALMACEN_CLAVE_ID`, `ALMACEN_CLAVE_SECRETA` y
   `ALMACEN_URL_PUBLICA` (explicadas en `.env.example`).
3. Si ya tienes fotos en `subidas/`: `npm run fotos:nube` (prueba) y `npm run fotos:nube -- --hacer`.

## Antes de publicar la web

La lista completa está en **`INFORME.md`** y cómo publicar en Render paso a paso, en **`DESPLIEGUE.md`**.
En resumen:

1. **Datos de la empresa** en `src/config/tienda.ts` y **revisión legal** de las páginas `/legal/…`.
2. **Base de datos**: proyecto de Atlas `valentia-prod` (ver `DESPLIEGUE.md`) y copias de seguridad.
3. **Variables del servidor**: `AUTH_SECRET` nueva, `NEXT_PUBLIC_SITE_URL` con `https://`, `DATABASE_URL`.
4. **Stripe**: claves reales, `STRIPE_PERMITIR_CLAVES_REALES="si"` y webhook en el panel de Stripe.
5. **Correo**: Resend con tu dominio verificado (sin esto nadie puede registrarse).
6. **Fotos del panel de producción**: Disk de Render o nube (ver `DESPLIEGUE.md` §2).
7. **Catálogo**: el inicial se carga solo desde `data/catalogo/` (Pre-Deploy Command `npm run predeploy:prod`,
   que solo crea lo que falta). Después se gestiona desde el **panel de administración de producción**: los
   despliegues nunca modifican lo que ya existe (`DESPLIEGUE.md` §6 bis).
8. **Administrador**: `npm run prod:admin` desde la Shell de Render. No cargues el seed de desarrollo.
9. **Vídeos** de los cursos (ahora «PENDIENTE») desde `/admin/cursos`.

## Actualizar las librerías

`npm outdated` muestra qué librerías tienen versiones nuevas. Las actualizaciones pequeñas suelen ser
seguras: después ejecuta `npm run lint`, `npm test`, `npm run build` y `npm run test:e2e`. **No** actualices
a Prisma 7 u 8 (no admiten MongoDB todavía), ESLint 10 ni TypeScript 7. `npm audit` avisa de problemas en ESLint y en la herramienta de
línea de órdenes de Prisma (`deepmerge-ts`); son de desarrollo y no afectan a la web: su «arreglo» bajaría a
Next 14 o cambiaría de versión de Prisma, así que hay que esperar a la corrección.
