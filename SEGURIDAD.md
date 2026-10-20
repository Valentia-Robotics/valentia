# Seguridad de Valentia

Revisión hecha el **17 de octubre de 2026** antes de publicar la web. Explica qué se ha revisado,
qué se ha corregido y qué queda pendiente para producción.

## Resumen

| Área                                              | Estado                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| Autorización en servidor (páginas, acciones, API) | ✅ Revisado: todo se comprueba en el servidor                             |
| Validación de entradas                            | ✅ Zod (o expresiones regulares estrictas) en todas las acciones          |
| Límite de intentos                                | ✅ En la base de datos: funciona con uno o varios servidores (serverless) |
| Pagos                                             | ✅ Stripe Payment Element + webhook con firma, idempotente                |
| Cabeceras de seguridad                            | ✅ CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy…       |
| Cookies y sesiones                                | ✅ httpOnly, SameSite=Lax, Secure en producción, caducan                  |
| Subida de fotos                                   | ✅ Tipo, tamaño y píxeles limitados; se recodifican; nombres del servidor |
| Secretos                                          | ✅ Ninguno en git ni en el navegador                                      |
| Errores                                           | ✅ Páginas propias (404/500) sin detalles internos                        |
| Dependencias                                      | ⚠ 5 avisos «altos» en herramientas de desarrollo (ver abajo)              |

## 1. Autorización

Revisadas **todas** las páginas, acciones del servidor (`"use server"`) y rutas de API:

- **Panel `/admin`**: cada página llama a `exigirAdmin()` y cada una de sus 17 acciones a
  `exigirAdminEnAccion()` (`src/lib/sesion.ts`). El rol se lee de la base de datos en cada petición:
  quitar el rol tiene efecto al momento. Un cliente que entra en `/admin` ve un 404.
- **Mi cuenta y cursos** (`/cuenta`, `/cuenta/pedidos`, `/cursos/…`, test): `exigirUsuario()` en
  cada página; las acciones comprueban que la lección, ejercicio, dispositivo o dirección es **del
  usuario** (consultas con `usuarioId`). Un curso no activado da 404. El test se corrige en el
  servidor y comprueba que el vídeo se ha visto; las respuestas correctas nunca llegan antes al navegador.
- **Pedidos** (`/pedido/[id]`): solo lo ve su dueño (cuenta o mismo email verificado), un
  administrador o quien tenga el **enlace privado** (`?t=` = HMAC del id con `AUTH_SECRET`,
  comparado en tiempo constante). La página pide `Referrer-Policy: no-referrer` para no filtrar el enlace.
- **Pago de prueba** y «Cambiar mis datos»: exigen el token del pedido; el pago de prueba solo
  funciona sin claves de Stripe (y en producción, solo con `PERMITIR_PAGO_SIMULADO="si"`).
- **Webhook** `/api/pagos/stripe`: firma verificada con `STRIPE_WEBHOOK_SECRET`; sin firma → 400.
- **`/dev/correos`**: 404 y su acción no hace nada si `NODE_ENV` no es `development`.
- **`/subidas/…`** (fotos): solo sirve `.webp/.png/.jpg` de la carpeta `subidas/`, sin poder salir de
  ella (`../`), con `nosniff`.
- **Descargas**: no hay descargas de archivos privados; las tarjetas QR de los lotes son del panel (admin).

## 2. Validación de entradas

Todas las acciones validan lo que reciben con **Zod** (o expresiones regulares estrictas para
códigos): checkout (incluida la zona de envío y que la provincia coincida con el código postal),
cuenta, cursos, panel, activación y verificación. **El precio nunca se toma del navegador**: el
servidor lo recalcula con la base de datos (`src/lib/pedidos.ts`) y Stripe cobra el total guardado
en el pedido. El webhook comprueba además que el importe cobrado y la moneda coinciden.

## 3. Límite de intentos (`src/lib/limite.ts`)

Ahora se guarda en la **base de datos** (tabla `LimiteIntento`, ventanas de tiempo fijas), así que
funciona igual con muchos servidores o en hosting serverless (antes estaba en memoria). De cada
clave solo se guarda una huella SHA-256 (ni IP ni email en claro).

| Acción                         | Límite                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| Iniciar sesión                 | 10 / 15 min por IP + email                                    |
| Registro                       | 5 / hora por IP                                               |
| Escribir el código de 6 cifras | 30 / 15 min por IP, y 5 intentos por código                   |
| Pedir otro código              | 10 / 15 min por IP, y 5 códigos / hora por email              |
| ¿Olvidaste tu contraseña?      | 10 / 15 min por IP                                            |
| Activar un código de kit       | 15 / 15 min por usuario; consultar códigos 40 / 15 min por IP |
| Checkout (preparar pedido)     | 20 / 15 min por IP (evita bloquear stock con pedidos falsos)  |
| Cambiar contraseña             | 5 / 15 min por usuario                                        |

La IP se toma de cabeceras del proveedor (`cf-connecting-ip`, `x-vercel-forwarded-for`,
`x-real-ip`) y, si no hay, de `x-forwarded-for`. **Pendiente al publicar:** comprobar qué cabecera
pone tu hosting; si la web no está detrás de un proxy, `x-forwarded-for` la puede inventar el
cliente (el límite por email/usuario sigue funcionando).

## 4. Cabeceras (`next.config.ts`)

- **Content-Security-Policy**: solo se carga código de la propia web, Stripe (`js.stripe.com`,
  `api.stripe.com`, `hooks.stripe.com`) y los reproductores de YouTube (`youtube-nocookie.com`) y
  Vimeo. `frame-ancestors 'none'`, `object-src 'none'`, `base-uri` y `form-action` limitados.
  Las fotos en la nube se permiten automáticamente desde `ALMACEN_URL_PUBLICA`.
  - Compromiso aceptado: `script-src 'unsafe-inline'` (Next.js lo necesita para las páginas
    estáticas; usar _nonces_ obligaría a generar todas las páginas en cada visita). React escapa
    todo el contenido, así que el riesgo de XSS es bajo. `'unsafe-eval'` solo en desarrollo.
- **Strict-Transport-Security** (2 años, preload), **X-Frame-Options: DENY**,
  **X-Content-Type-Options: nosniff**, **Referrer-Policy: strict-origin-when-cross-origin**,
  **Permissions-Policy** (sin cámara, micro, ubicación…; pago solo para Stripe),
  **Cross-Origin-Opener-Policy**, y se quita `X-Powered-By`.

## 5. Cookies, sesiones y CSRF

- Sesión de Auth.js (JWT cifrado): `httpOnly`, `SameSite=Lax`, `Secure` con https. Caduca a los
  30 días y **en cada lectura** se comprueba que su dispositivo sigue siendo de confianza (si borras
  el dispositivo o cambias la contraseña, la sesión se cierra al momento).
- Cookies propias (`valentia_dispositivo`, `valentia_verificacion`): `httpOnly`, `SameSite=Lax`,
  `Secure` en producción; en la base de datos solo se guarda su hash.
- **CSRF**: las acciones del servidor de Next.js comprueban que el origen de la petición es la
  propia web; Auth.js usa su token CSRF; el webhook se valida por firma. `SameSite=Lax` añade otra capa.

## 6. Subida de fotos (`src/lib/almacenamiento`)

Solo JPG, PNG o WebP de hasta 5 MB (y 6 MB por petición en `next.config.ts`), máximo 40 megapíxeles.
Cada foto se **decodifica y recodifica a WebP** con sharp (si no es una imagen real, se rechaza), se
reduce a 1600 px y se guarda con un **nombre al azar generado por el servidor**. SVG no se admite.

## 7. Secretos

- `.env` está en `.gitignore` y nunca se ha subido (revisado el historial). `.env.example` no tiene
  secretos.
- En el navegador solo hay variables `NEXT_PUBLIC_*` (dirección de la web y clave **publicable** de
  Stripe). Comprobado que `AUTH_SECRET` y ninguna clave `sk_`/`whsec_` aparecen en `.next/static`.
- Solo se aceptan claves de Stripe de **prueba** salvo `STRIPE_PERMITIR_CLAVES_REALES="si"`.

## 8. Errores

`src/app/not-found.tsx` (404), `src/app/error.tsx` (500, con referencia pero sin detalles) y
`src/app/global-error.tsx`. Las acciones devuelven mensajes genéricos y escriben el detalle solo en
el registro del servidor.

## 9. Dependencias (`npm audit`)

- Aplicado `npm audit fix` (Prisma 7.10.1, eslint-config-next 16.4.2): de 9 avisos «altos» a 5.
- Quedan 5 en `braces`/`micromatch` dentro de **ESLint** (`eslint-config-next`): solo se usa al
  programar, no llega a la web. El único arreglo propuesto bajaría a Next 14 (rompería el proyecto).
  Esperar a una versión corregida.

## 10. Pendiente para producción

1. **HTTPS** obligatorio en el dominio (HSTS ya está preparado) y `NEXT_PUBLIC_SITE_URL` con `https://`.
2. **`AUTH_SECRET` nuevo y largo** en el servidor (`npx auth secret`). Cambiarlo invalida las sesiones y
   los enlaces privados de pedidos ya enviados por email.
3. Comprobar la **cabecera de la IP** del hosting (punto 3) y, si hay proxy propio, configurarlo.
4. **Webhook de Stripe** en el panel de Stripe apuntando a `https://valentiarobotics.com/api/pagos/stripe` con
   el evento `payment_intent.succeeded` y `payment_intent.canceled`; copiar su `whsec_…`.
5. Copias de seguridad de la base de datos (MongoDB Atlas M0: a mano, `npm run db:copia`) y del almacén de fotos.
6. Activar la autenticación en dos pasos en las cuentas de Stripe, del hosting y del correo.
7. Opcional: un servicio de monitorización de errores y alertas (por ejemplo, Sentry).
8. Revisar periódicamente `npm audit` y actualizar dependencias.
