# Informe de la fase de lanzamiento

Fecha: **17 de octubre de 2026** · Trabajo autónomo, sin preguntas, según el encargo «Valentia — Fase de
lanzamiento». Cada bloque tiene su commit en git (`Lanzamiento (1/10)` … `(10/10)`).

> **Resultado:** la web funciona entera en tu ordenador con pagos de prueba. `npm run lint`,
> `npm run build`, las **51 pruebas unitarias** y las **8 pruebas con navegador** (incluido el recorrido
> completo) pasan sin errores. Para publicarla faltan las tareas de la última sección, que son tuyas.

## 1. Lo que se ha hecho

| Bloque           | Resumen                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Negocio       | `src/config/tienda.ts`: envío solo a la Comunidad Valenciana (CP 03, 46, 12), 4,95 € y gratis desde 50 €, IVA 21 % desglosado en carrito, checkout, pedido y correos, datos de empresa como marcadores `[RAZÓN SOCIAL]`, `[NIF]`…                                                                                                                       |
| 2. Portada       | Robot protagonista en **3D** (three.js) hecho con formas geométricas: gira y se despieza en chasis, placa, motores, sensores y batería al hacer scroll, explicando cada pieza. Carga diferida y solo en equipos capaces; en móvil, equipos lentos o «reducir movimiento», dibujo SVG ligero. Nuevos bloques con animaciones de entrada y cifras reales. |
| 3. Navegación    | Sección activa marcada (raya azul, «Estás aquí» en el móvil) incluidas subpáginas, carrito/checkout y Mi cuenta; enlace «Inicio». El panel ya lo hacía.                                                                                                                                                                                                 |
| 4. Cursos        | «Hacer el test» se desbloquea al terminar el vídeo (YouTube IFrame API, Vimeo Player SDK y vídeo nativo). Pantalla propia, pregunta a pregunta, puntuación, explicaciones, repetir, volver al vídeo; resultado guardado.                                                                                                                                |
| 5. Pagos         | Stripe Payment Element + webhook firmado e idempotente; pago de prueba sin claves; envío con teléfono y provincia; compra como invitado o con cuenta y direcciones guardadas; stock reservado; códigos y correo al pagar; panel de pedidos con estados, seguimiento y correo de envío; «Mis pedidos».                                                   |
| 6. Base de datos | Lista para PostgreSQL cambiando solo `DATABASE_URL` (esquema y migración inicial generados); fotos en la nube compatibles con S3 cambiando solo `.env`.                                                                                                                                                                                                 |
| 7. Legal         | Aviso legal, privacidad, cookies, condiciones de venta y devoluciones (**BORRADORES**); banner de cookies con consentimiento real (los vídeos de YouTube/Vimeo no se cargan sin él).                                                                                                                                                                    |
| 8. Seguridad     | Revisión completa (ver `SEGURIDAD.md`): límites de intentos en la base de datos, cabeceras (CSP, HSTS…), páginas de error, Zod, `npm audit` (de 9 a 5 avisos, solo en ESLint).                                                                                                                                                                          |
| 9. Calidad       | Vitest + Playwright, SEO (sitemap, robots, imagen para redes), estados de carga, auditoría de accesibilidad y móvil (0 problemas en 28 páginas).                                                                                                                                                                                                        |
| 10. Cierre       | README, CLAUDE.md, este informe, graphify y servidor arrancado.                                                                                                                                                                                                                                                                                         |

**Paquetes nuevos** (cada uno explicado en su commit): `three` (gráficos 3D), `stripe` y
`@stripe/stripe-js` (pagos), `@prisma/adapter-pg` (conexión con PostgreSQL), `aws4fetch` (subir fotos a
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
12. **Migración inicial de PostgreSQL** generada desde el esquema; las migraciones de SQLite se mantienen
    para tu ordenador.
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
3. **Hosting** con HTTPS y tu dominio (por ejemplo Vercel, Railway o un servidor propio).
4. **Base de datos PostgreSQL** (Neon, Supabase…): pon su `DATABASE_URL` y ejecuta
   `npx prisma migrate deploy` (README, «Pasar a PostgreSQL»). Activa copias de seguridad.
5. **Variables del servidor**: `AUTH_SECRET` nueva (`npx auth secret`) y `NEXT_PUBLIC_SITE_URL` con
   `https://tudominio` (los QR impresos y los correos apuntan ahí).
6. **Stripe**: activa tu cuenta (datos fiscales y bancarios), prueba antes todo con claves de prueba
   (README, «Pagos con Stripe»), y al publicar pon las claves reales, `STRIPE_PERMITIR_CLAVES_REALES="si"`
   y crea el **webhook** en el panel de Stripe → `https://tudominio/api/pagos/stripe` con los eventos
   `payment_intent.succeeded` y `payment_intent.canceled`; copia su `whsec_…` en `STRIPE_WEBHOOK_SECRET`.
7. **Proveedor de correo**: Resend (u otro) con tu dominio verificado. **Sin esto nadie puede registrarse**.
8. **Fotos en la nube** (Cloudflare R2 o similar) y `npm run fotos:nube -- --hacer` si ya subiste fotos.
9. **Administrador**: regístrate en la web publicada y ejecuta `npm run admin -- tu@email.com`.

### Importante

10. **Productos y cursos reales** desde el panel; **no** cargues los datos de prueba (seed) ni el usuario o
    los códigos `VAL-PRUE-…`.
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
- **Almacén en la nube y PostgreSQL**: sin cuentas en esos servicios, no se han probado contra un
  servidor real (el código compila contra PostgreSQL y la migración se ha generado).
- **Envío real de correos** (Resend): igual que antes, solo probado en modo consola.

## 5. Cómo verlo

```bash
npm run dev          # http://localhost:3000
npm test             # 51 pruebas unitarias
npm run test:e2e     # 8 pruebas con navegador (tarda un par de minutos)
```

Para probar una compra: añade un kit al carrito → «Tramitar pedido» → rellena los datos con un código
postal que empiece por 46, 03 o 12 → «Continuar al pago» → «Confirmar pago de prueba». El correo de
confirmación aparece en **http://localhost:3000/dev/correos**.
