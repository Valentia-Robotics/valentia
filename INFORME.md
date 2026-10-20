# Informe de la fase de lanzamiento

Fecha: **17 de octubre de 2026** · Trabajo autónomo, sin preguntas, según el encargo «Valentia — Fase de
lanzamiento». Cada bloque tiene su commit en git (`Lanzamiento (1/10)` … `(10/10)`).

> **Resultado:** la web funciona entera en tu ordenador con pagos de prueba. `npm run lint`,
> `npm run build`, las **51 pruebas unitarias** y las **8 pruebas con navegador** (incluido el recorrido
> completo) pasan sin errores. Para publicarla faltan las tareas de la última sección, que son tuyas.

> **Actualización 19-10-2026 — base de datos y hosting:** por decisión del usuario, la web usa ahora
> **MongoDB Atlas** (Prisma 6.19, porque Prisma 7 no admite MongoDB) y se publicará en **Render**. Lo que
> este informe dice de PostgreSQL (bloque 6, decisión 12) quedó sustituido: ya no hay migraciones ni
> esquema de PostgreSQL. La guía de publicación es `DESPLIEGUE.md`; los detalles, en el README («Base de
> datos», «Copias de seguridad») y en CLAUDE.md. Pruebas tras el cambio: 54 unitarias y 8 con navegador
> en verde contra Atlas, más una revisión del panel, la activación por QR y la concurrencia de stock y códigos.

> **Actualización 20-10-2026 — puesta a punto final** (rama `valentiarobotics/puesta-a-punto`, encargo en
> `PUESTA_A_PUNTO.md`): web depurada y **catálogo de producción listo para cargarse solo en Render**. Ver
> §0. Lint, tipos, build, **94 pruebas unitarias** y **11 con navegador** en verde.

## 0. Puesta a punto final (19–20 de octubre de 2026)

**Qué he corregido o añadido**

- **Despliegue «Timed Out» en Render**: no existía `/api/health` (la página que Render visita para saber si
  la web está viva). Ahora responde al instante sin tocar la base de datos; `/api/health?db=1` prueba
  también MongoDB (máx. 4 s) y explica el fallo en los Logs. `npm run db:check` diagnostica la conexión.
- **Aviso de Turbopack** en `src/lib/almacenamiento/local.ts` eliminado.
- **Recorrido automático de todas las páginas** (`e2e/todas-las-paginas.spec.ts`): 23 públicas, 11 de
  cuenta y ~120 del panel, más las principales en móvil. Busca errores de consola, errores del servidor,
  enlaces e imágenes rotas y desbordes. No encontró errores.
- **Base de datos vacía**: nada se rompe; /kits y /componentes muestran un mensaje amable.
- **El catálogo aparece solo**: portada, kits, componentes y sitemap se vuelven a leer cada 5 minutos, así
  que lo que el Pre-Deploy carga después de compilar se ve sin volver a desplegar.
- **Catálogo de producción** en `data/catalogo/` (exportado de `valentia-dev`: 18 componentes, 3 kits,
  3 cursos, 14 lecciones, 18 ejercicios; sin usuarios, pedidos, códigos ni progreso) y tres comandos:
  `catalogo:exportar`, `seed:prod` (carga sin borrar nunca nada) y `predeploy:prod` (`prisma db push` sin
  pérdida de datos + `seed:prod`). Probado dos veces seguidas en bases de datos temporales: no duplica.
- **`npm run prod:admin`**: crea tu administrador desde la Shell de Render (contraseña oculta).
- Actualizaciones: Next 16.4.2, postcss, lucide-react. `npm audit`: quedan 8 avisos «altos» sin arreglo
  seguro (solo herramientas de desarrollo: ESLint y la CLI de Prisma).

**Decisiones que he tomado**

1. **No me he conectado nunca a `valentia-prod`.** La base de datos real se llena sola en Render con el
   Pre-Deploy Command al unir el pull request.
2. `seed:prod` **solo crea lo que falta**: nunca modifica lo que ya existe en producción (tampoco el stock) y
   **no recrea** lo que borres allí. El catálogo de producción se gestiona desde su panel (decisión del
   usuario, 20-10-2026; antes actualizaba las fichas cambiadas en el JSON).
3. Si `prisma db push` fuera a perder datos, el despliegue **se cancela** y la web sigue con la versión
   anterior (no se usa `--accept-data-loss`).
4. Las categorías y reglas de compatibilidad no se exportan: están en el código, no en la base de datos.
5. El PR #10 (`catalogo:copiar`, que se conectaba a producción desde tu ordenador) queda sustituido.

## 1. Lo que se ha hecho

| Bloque           | Resumen                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Negocio       | `src/config/tienda.ts`: envío solo a la Comunidad Valenciana (CP 03, 46, 12), 4,95 € y gratis desde 50 €, IVA 21 % desglosado en carrito, checkout, pedido y correos, datos de empresa como marcadores `[RAZÓN SOCIAL]`, `[NIF]`…                                                                                                                       |
| 2. Portada       | Robot protagonista en **3D** (three.js) hecho con formas geométricas: gira y se despieza en chasis, placa, motores, sensores y batería al hacer scroll, explicando cada pieza. Carga diferida y solo en equipos capaces; en móvil, equipos lentos o «reducir movimiento», dibujo SVG ligero. Nuevos bloques con animaciones de entrada y cifras reales. |
| 3. Navegación    | Sección activa marcada (raya azul, «Estás aquí» en el móvil) incluidas subpáginas, carrito/checkout y Mi cuenta; enlace «Inicio». El panel ya lo hacía.                                                                                                                                                                                                 |
| 4. Cursos        | «Hacer el test» se desbloquea al terminar el vídeo (YouTube IFrame API, Vimeo Player SDK y vídeo nativo). Pantalla propia, pregunta a pregunta, puntuación, explicaciones, repetir, volver al vídeo; resultado guardado.                                                                                                                                |
| 5. Pagos         | Stripe Payment Element + webhook firmado e idempotente; pago de prueba sin claves; envío con teléfono y provincia; compra como invitado o con cuenta y direcciones guardadas; stock reservado; códigos y correo al pagar; panel de pedidos con estados, seguimiento y correo de envío; «Mis pedidos».                                                   |
| 6. Base de datos | ~~Lista para PostgreSQL~~ (sustituido por MongoDB Atlas el 19-10-2026, ver arriba); fotos en la nube compatibles con S3 cambiando solo `.env`.                                                                                                                                                                                                          |
| 7. Legal         | Aviso legal, privacidad, cookies, condiciones de venta y devoluciones (**BORRADORES**); banner de cookies con consentimiento real (los vídeos de YouTube/Vimeo no se cargan sin él).                                                                                                                                                                    |
| 8. Seguridad     | Revisión completa (ver `SEGURIDAD.md`): límites de intentos en la base de datos, cabeceras (CSP, HSTS…), páginas de error, Zod, `npm audit` (de 9 a 5 avisos, solo en ESLint).                                                                                                                                                                          |
| 9. Calidad       | Vitest + Playwright, SEO (sitemap, robots, imagen para redes), estados de carga, auditoría de accesibilidad y móvil (0 problemas en 28 páginas).                                                                                                                                                                                                        |
| 10. Cierre       | README, CLAUDE.md, este informe, graphify y servidor arrancado.                                                                                                                                                                                                                                                                                         |

**Paquetes nuevos** (cada uno explicado en su commit): `three` (gráficos 3D), `stripe` y
`@stripe/stripe-js` (pagos), `@prisma/adapter-pg` (conexión con PostgreSQL; retirado al pasar a MongoDB, que añadió `mongodb` para las copias de seguridad), `aws4fetch` (subir fotos a
almacenes tipo S3), y para desarrollo `@playwright/test`, `vitest` y `@types/three`.

## 2. Decisiones que he tomado por mi cuenta

1. **El stock se reserva al crear el pedido, no al cobrar.** Pediste descontarlo al confirmarse el pago;
   lo he hecho antes (y se devuelve si el pago no llega en 60 minutos o se anula) para **no cobrar nunca
   algo que ya no queda** si dos personas compran la última unidad a la vez. Si un pago llega tarde a un
   pedido ya caducado, se intenta reservar de nuevo; si no hay stock, se avisa en el registro para
   devolver el dinero. Se cambia en `MINUTOS_RESERVA` (`src/lib/pedidos.ts`).
2. **Solo claves de prueba de Stripe**: la web rechaza las reales salvo `STRIPE_PERMITIR_CLAVES_REALES="si"`.
3. **El pago de prueba está desactivado en la web publicada** salvo `PERMITIR_PAGO_SIMULADO="si"`, para
   que nadie consiga pedidos gratis si un día faltan las claves de Stripe.
4. **Enlace privado de cada pedido** firmado con `AUTH_SECRET` (`/pedido/id?t=…`): así los invitados
   pueden ver su pedido desde el correo, y nadie más. Antes bastaba con conocer el id.
5. **Los pedidos de invitado con el mismo email** aparecen también en «Mis pedidos» de esa cuenta (el email
   está verificado, así que son suyos).
6. **Aprobar el test** (acertar al menos la mitad) marca la lección como completada.
7. Si la API de YouTube/Vimeo no carga (por ejemplo, la bloquea una extensión), aparece **«He terminado el
   vídeo»** para no dejar a nadie atascado. Las lecciones aún sin vídeo permiten hacer el test.
8. **Marcar un pedido como «Enviado» exige número de seguimiento** (es lo que se manda al cliente).
   Cancelar un pedido pagado devuelve el stock y desactiva sus códigos sin usar; el **reembolso se hace a
   mano en Stripe** (no automático, para evitar devoluciones por error).
9. **CSP con `'unsafe-inline'`** en scripts: necesario para que las páginas sigan siendo estáticas (rápidas).
   Explicado en `SEGURIDAD.md`.
10. **Cookies**: no se usa analítica ni publicidad; los vídeos de YouTube/Vimeo se consideran cookies de
    terceros opcionales (necesitan consentimiento). Stripe se considera necesaria (prevención del fraude).
11. **Garantía y desistimiento** redactados con el TRLGDCU vigente (3 años de garantía, 14 días). El caso del
    curso ya activado al devolver un kit queda marcado `[REVISAR CON UN ABOGADO]`.
12. ~~**Migración inicial de PostgreSQL**~~ (ya no aplica: MongoDB no usa migraciones, se usa `prisma db push`).
13. Pedidos antiguos: una migración rellena su subtotal e IVA (antes el envío era gratis). No había pedidos.
14. Se **eliminó** la corrección pregunta a pregunta antigua (`responderTest`), sustituida por el test completo.

## 3. Lo que tienes que hacer tú antes de publicar

Ordenado por prioridad. Ninguno requiere programar; si algo no está claro, pídemelo.

### Imprescindible

1. **Datos de la empresa** en `src/config/tienda.ts`: razón social, NIF, dirección, email, teléfono,
   registro mercantil y dominio (ahora son `[MARCADORES]`).
2. **Revisión legal**: que un abogado revise las 5 páginas de `/legal/` (llevan el aviso
   «BORRADOR — pendiente de revisión por un profesional» y marcas `[REVISAR…]`: duración del acceso a los
   cursos, coste de las devoluciones, contenido digital ya activado, arbitraje, lista de proveedores).
   Después, quita el aviso (`borrador={false}`).
3. **Hosting en Render** con HTTPS y tu dominio: sigue `DESPLIEGUE.md`.
4. **Base de datos**: proyecto de MongoDB Atlas `valentia-prod` (M0 en Frankfurt), Network Access solo con
   las IP de Render y **copias de seguridad a mano** (`npm run db:copia`; el M0 no las hace solo).
5. **Variables del servidor**: `AUTH_SECRET` nueva (`npx auth secret`) y `NEXT_PUBLIC_SITE_URL` con
   `https://tudominio` (los QR impresos y los correos apuntan ahí).
6. **Stripe**: activa tu cuenta (datos fiscales y bancarios), prueba antes todo con claves de prueba
   (README, «Pagos con Stripe»), y al publicar pon las claves reales, `STRIPE_PERMITIR_CLAVES_REALES="si"`
   y crea el **webhook** en el panel de Stripe → `https://tudominio/api/pagos/stripe` con los eventos
   `payment_intent.succeeded` y `payment_intent.canceled`; copia su `whsec_…` en `STRIPE_WEBHOOK_SECRET`.
7. **Proveedor de correo**: Resend (u otro) con tu dominio verificado. **Sin esto nadie puede registrarse**.
8. **Fotos en la nube** (Cloudflare R2 o similar) y `npm run fotos:nube -- --hacer` si ya subiste fotos.
9. **Render, tras unir el pull request de la puesta a punto** (`DESPLIEGUE.md` §3 y §6):
   _Settings → Build & Deploy → Pre-Deploy Command_ = `npm run predeploy:prod`; _Settings → Health Checks →
   Health Check Path_ = `/api/health`; despliega (el catálogo se carga solo) y, en la pestaña **Shell**,
   `npm run prod:admin` para crear tu administrador.

### Importante

10. **Revisar el catálogo** cargado (precios, textos, fotos) desde el panel; **no** cargues los datos de
    prueba (`db:seed`) ni el usuario o los códigos `VAL-PRUE-…`.
11. **Vídeos** de las lecciones (ahora «PENDIENTE») desde `/admin/cursos`.
12. **Envío**: confirmar los importes provisionales (4,95 € y gratis desde 50 €) y el plazo, y elegir
    transportista.
13. **Facturas**: la web guarda los pedidos con el IVA desglosado, pero **no emite facturas**; decide con tu
    gestoría cómo hacerlas (o si quieres que añada facturas en PDF).
14. Comprobar en el hosting la **cabecera de la IP** para el límite de intentos (`SEGURIDAD.md`, punto 3).

### Recomendable

15. Verificación en dos pasos en Stripe, hosting y correo.
16. Un servicio de avisos de errores (por ejemplo, Sentry) y revisar `npm audit` de vez en cuando.
17. Probar la tienda en tu móvil antes de anunciarla.

## 4. Lo que no he podido comprobar

- **Stripe real**: sin claves no se puede abrir el formulario de Stripe ni recibir webhooks reales. El
  código sigue la documentación oficial y el resto del flujo está probado con el pago de prueba; la
  primera prueba con claves `sk_test_` y `stripe listen` es lo primero que conviene hacer.
- **Almacén en la nube y Render**: sin cuentas en esos servicios, no se han probado contra un servidor real.
  La base de datos sí: todo se ha probado contra un clúster de MongoDB Atlas de desarrollo.
- **Envío real de correos** (Resend): igual que antes, solo probado en modo consola.

## 5. Cómo verlo

```bash
npm run dev          # http://localhost:3000
npm test             # 94 pruebas unitarias
npm run test:e2e     # 11 pruebas con navegador (tarda un par de minutos)
```

Para probar una compra: añade un kit al carrito → «Tramitar pedido» → rellena los datos con un código
postal que empiece por 46, 03 o 12 → «Continuar al pago» → «Confirmar pago de prueba». El correo de
confirmación aparece en **http://localhost:3000/dev/correos**.
