# Valentia — contexto para Claude

Lee también `AGENTS.md` (lo genera Next.js): esta versión de Next.js (16) tiene cambios
importantes; consulta `node_modules/next/dist/docs/` antes de usar APIs que no conozcas.

## Estado del proyecto

> Actualizar esta sección al terminar cada fase.

**Las 6 fases están terminadas: versión local completa.** Siguiente paso posible (a decidir con el usuario): preparar la
publicación (lista «Antes de publicar la web» del README). No empezar trabajo nuevo grande sin la aprobación del usuario.

### Terminado

- **Fase 1** (`841b2ac`): proyecto Next.js + TypeScript + Tailwind, sistema de diseño en `globals.css`,
  logo en SVG y PNG, favicon e iconos con el monograma "V", barra de navegación translúcida con contador
  de carrito (Zustand), menú móvil, pie de página, página `/diseno`, 404, CLAUDE.md y README.
- **Fase 2** (`2ce3987`): Prisma 7.10 + SQLite (`prisma.config.ts`, migración y seed validado con Zod),
  datos de prueba (18 componentes, 3 kits, 3 cursos con 14 lecciones), ilustraciones SVG de muestra,
  portada estilo Apple, `/kits` y `/kits/[slug]` (añadir al carrito y "Personalizar este kit").
- **Fase 3** (`f10469b`, README en `c03b780`): `/configurador` estilo quiosco (categorías con icono, tarjetas, detalle en <dialog> con cantidad,
  panel "Tu robot" con +/−, medidores de pines y energía, avisos con botón para añadir la pieza sugerida, total y
  "Añadir al carrito" como artículo tipo "configuracion"), empezar desde cero o desde un kit (`?kit=slug`, luego se limpia la URL),
  móvil con categorías deslizables y panel inferior. Reglas como datos en `src/lib/compatibilidad/reglas.ts` (motor en `comprobar.ts`).
  Robot guardado en localStorage (`src/store/configurador.ts`). Página `/componentes`. Botón genérico `BotonAnadirCarrito`
  (sustituye a BotonAnadirKit), `ui/Dialogo` y `ui/SelectorCantidad` reutilizables para la fase 4. Probado en Chrome headless
  (escritorio y móvil, sin errores de consola).
- **Fase 4** (`7a56efb`): `/carrito`, `/checkout` (formulario con `useActionState` + acción del servidor
  en `src/app/(tienda)/checkout/acciones.ts`) y `/pedido/[id]` (confirmación + tarjetas de activación con QR imprimibles,
  `print:hidden` en navegación y pie). El servidor recalcula precios (avisa y actualiza el carrito si cambian), valida con
  Zod (`src/lib/validaciones/pedido.ts`), descuenta stock en una transacción (`src/lib/pedidos.ts`) y crea un código
  `VAL-XXXX-XXXX` por cada unidad de kit al marcar el pedido como PAGADO (`marcarPedidoPagado`, reutilizable por el webhook de
  Stripe). Pagos en `src/lib/pagos` (`PAGOS_PROVEEDOR=simulado|stripe`; stripe.ts es un esqueleto con los pasos).
  Modelos `Pedido`, `LineaPedido`, `CodigoActivacion` (migración `pedidos`). Carrito v2: artículos con `slug`/`piezas`
  (migra los guardados en v1). Seed: códigos de prueba fijos `VAL-PRUE-CAR2/3`, `BRZ2/3`, `MET2/3` y borra pedidos.
  Paquete nuevo: `qrcode` (+ `@types/qrcode`). Envío gratis. Componentes nuevos: `ui/Campo`, `compra/*`.
  Probado en Chrome headless (compra completa, errores de formulario, cambio de precios, stock, impresión y móvil).
- **Fase 5** (`c9e5423`): Auth.js `next-auth@5.0.0-beta.32` con Credentials + sesión JWT.
  Config partida: `src/auth.config.ts` (sin BD: `authorized`, callbacks, `RUTAS_PROTEGIDAS`, `trustHost`) que usa
  `src/proxy.ts`, y `src/auth.ts` (authorize con bcryptjs). Ruta `api/auth/[...nextauth]`. Comprobación segura en
  `src/lib/sesion.ts` (`obtenerUsuario` con `cache` + BD, `exigirUsuario(volver)`). Login/registro: `FormularioCuenta` usa
  `signIn` de `next-auth/react` (redirect:false) y luego `window.location.assign` para que la sesión se vea en toda la web;
  el registro crea el usuario con la acción `src/app/(auth)/acciones.ts`. `rutaSegura` (validaciones/cuenta.ts) solo deja
  volver a rutas propias (se queda con pathname+search). `SessionProvider` en `layout/Proveedores.tsx` (las páginas de tienda
  siguen estáticas); `MenuUsuario` + menú móvil con cerrar sesión. `/activar` (estados: sin código, no existe, usado,
  sin sesión → login/registro con callbackUrl, ya tienes el curso → el código NO se gasta, activar). `src/lib/activacion.ts`
  (transacción, `updateMany ... usadoEn: null`). `/cursos`, `/cursos/[slug]` (redirige a la siguiente lección) y
  `/cursos/[slug]/[leccion]` (temario lateral, vídeo con `src/lib/video.ts`, completar con `useOptimistic`, tests corregidos
  en servidor y retos con pistas y solución desbloqueable). `src/lib/cursos.ts` nunca envía `correcta`/`explicacion`/`solucion`
  antes de tiempo. Acciones en `src/app/(cuenta)/cursos/acciones.ts`. Modelos `Usuario`, `CursoUsuario`, `ProgresoLeccion`,
  `ProgresoEjercicio` + `CodigoActivacion.usuarioId` (migración `usuarios_y_progreso`). Seed: usuario de prueba
  `prueba@valentia.test` / `robots2026` (sin cursos). Paquetes nuevos: `next-auth@beta`, `bcryptjs`.
  Probado en Chrome headless: proxy → login con vuelta, contraseña incorrecta, activación, test, pistas y solución, progreso
  guardado, curso ajeno → 404, código usado por otra cuenta, registro con errores, cerrar sesión y móvil.
- **Fase 6** (repaso final de calidad): auditoría con axe-core (instalado solo en el scratchpad, no en el proyecto) de
  15 páginas en móvil 390 px y escritorio → 0 problemas tras subrayar los enlaces dentro de texto (el aviso de contraste
  de la ficha de kit era un falso positivo de la animación `aparecer`; con reduced-motion da 0). Sin desborde horizontal.
  Peso: ~155–170 KB de JS y <310 KB por página. Límite de intentos en memoria `src/lib/limite.ts` (`LIMITES`: login por
  IP+email con `CredentialsSignin` code "demasiados-intentos", registro por IP solo al crear, activar por usuario,
  consultar código en `/activar` por IP). Pie de página según sesión (`EnlacesPie` + `enlacesConSesion` en marca.ts).
  Actualizaciones menores: next/eslint-config-next 16.4.1, react 19.3.1, dotenv 18.0.8. README final (páginas, tecnología,
  calidad, «Antes de publicar», actualizar librerías).

- **Panel de administración** (en curso, 7 partes aprobadas; ver «Panel de administración» más abajo):
  - Parte 1: enum `Rol` (CLIENTE/ADMIN, migración `roles`), `exigirAdmin()` en páginas y `exigirAdminEnAccion()` en acciones
    (src/lib/sesion.ts), `/admin` en RUTAS_PROTEGIDAS, script `npm run admin -- email [--quitar]`, layouts por zona con
    `MarcoWeb` (la raíz ya no pone barra ni pie), piezas del panel en `src/components/admin`, seed solo si la BD está vacía.
  - Parte 2: `/admin` (cifras en `src/lib/admin/estadisticas.ts`) y `/admin/usuarios` (`src/lib/admin/usuarios.ts`;
    los pedidos se cuentan por email porque aún no van unidos a la cuenta).
  - Parte 3: fotos en `src/lib/almacenamiento` (`subirImagen`/`borrarImagen`; sharp → WebP ≤1600 px; local en `subidas/`,
    fuera de git, servida por `src/app/subidas/[...ruta]/route.ts`; `nube.ts` es un esqueleto; `ALMACEN_PROVEEDOR`).
    sharp pasa a dependencia normal. `bodySizeLimit` 6 MB en next.config.ts. `Componente.visible` (migración
    `componentes_ocultos`): los ocultos no salen en /componentes, configurador ni checkout. `/admin/componentes`
    (lista, nuevo, editar, ocultar, borrar bloqueado si está en un kit). `refrescarTienda()` = revalidatePath("/", "layout").
    Formularios: `useFormulario` (no vacía el formulario al fallar) + `EstadoFormulario` + `src/lib/validaciones/admin.ts`.
  - Parte 4: `Kit.visible` (migración `kits_ocultos`; ocultos fuera de portada, /kits, ficha → 404, configurador y checkout;
    sus códigos siguen funcionando). `/admin/kits` con `SelectorPiezas` (buscador), curso (solo cursos sin kit), un solo
    destacado, borrar bloqueado si tiene códigos o pedidos (el curso queda libre).

### Pendiente (para cuando se publique la web; ver README «Antes de publicar»)

- PostgreSQL, Stripe real, `AUTH_SECRET` y `NEXT_PUBLIC_SITE_URL` de producción, quitar textos de «pago simulado».
- Necesitan servicio de emails: «¿Olvidaste tu contraseña?» y confirmación del pedido por email.
- Valorar enlazar los pedidos al usuario (hoy `/pedido/[id]` es accesible con el id, difícil de adivinar).
- Con varios servidores, el límite de intentos debería ir a Redis u otro almacén compartido.

### Avisos abiertos

- `/configurador`, `/pedido/[id]`, `/activar`, `/login`, `/registro` y `/cursos/*` son dinámicas: `npm start` necesita la BD.
- `npm run db:seed` borra los pedidos de prueba y sus códigos (los códigos dependen de los kits, que se recrean), y las
  cuentas pierden sus cursos y su progreso (dependen del catálogo). Las cuentas en sí se conservan.
- Las pruebas con Chrome headless no conservan la sesión entre ejecuciones (se cierra de golpe): iniciar sesión en la misma ejecución.
- No se envían emails: el email del pedido solo se guarda como contacto.
- `npm audit`: 9 vulnerabilidades "altas", todas en herramientas de desarrollo/compilación: ESLint (braces/micromatch, vía
  eslint-config-next; el "arreglo" bajaría a Next 14) y la CLI de Prisma (deepmerge-ts, mysql2; el "arreglo" bajaría a
  Prisma 6). Revisado en la fase 6: no afectan a la web en ejecución (mysql2 ni se usa). Esperar a versiones corregidas.
- `graphify-out/` (salida de la herramienta graphify del usuario) no está en git ni en .gitignore: no tocarla sin preguntar.
- npm avisa de "install scripts not yet covered by allowScripts" (prisma, @prisma/engines, better-sqlite3,
  esbuild, unrs-resolver). Por ahora solo es un aviso y los scripts se ejecutan; no se ha cambiado ninguna configuración.
- Vídeos de los cursos: `"videoUrl": "PENDIENTE"` en `data/cursos.json`, a la espera de las URL reales.
- Decisión opcional del usuario: la portada muestra el kit estrella en el hero y una sección para cada uno
  de los otros dos kits; se puede cambiar a una sección por cada uno de los tres.
- Identidad de git configurada solo en este repositorio: `Diego <diegonotsa@gmail.com>`.

### Decisiones aprobadas por el usuario

- Color de acento "Azul circuito" **#2D4BFF** (#7A8CFF sobre fondos oscuros).
- **Auth.js v5 beta** (`next-auth@beta`).
- Logo redibujado en **SVG** y monograma **"V"** para el favicon y los iconos (sin tocar `imagenes/logo.png`).
- Iconos con **lucide-react**.
- **Euros con IVA incluido** y español de España (**es-ES**).
- El cliente puede **montarse su propio kit** en el configurador (previsto desde el principio). Un robot personalizado,
  aunque parta de un kit, **no incluye curso ni código QR**: solo los kits cerrados.
- Proyecto trasladado a **`C:\Proyectos\valentia`** (fuera de OneDrive). La carpeta original de OneDrive no se toca.

## Qué es Valentia

Startup que vende **kits de robótica cerrados** (coche seguidor de líneas, brazo robótico,
estación meteorológica) y **componentes sueltos**. Tiene:

- Un **configurador** (estilo quiosco de pedidos) para montar un robot pieza a pieza,
  con avisos de incompatibilidad. Las reglas son **datos** en `src/lib/compatibilidad`, nunca escritas a fuego.
- Cada kit físico lleva un **QR con un código único** → `/activar?codigo=XXXX` → inicia sesión
  → el curso del kit queda en **"Mis cursos"** (vídeos y ejercicios).
- Fase actual: versión local completamente funcional con **pagos simulados**
  (el código queda preparado para Stripe en `src/lib/pagos`).

Requisitos completos: `PROMPT.md`.

## Usuario

- Es **principiante y no sabe programar**. Háblale siempre en **español** y explica cada paso
  como si fuera la primera vez que hace una web.
- Textos de la web: tono cercano y motivador ("cualquiera puede construir su propio robot").
- Idioma y formato: español de España, precios en euros con IVA incluido (se guardan en céntimos).

## Reglas de trabajo

1. Planificar primero y esperar aprobación en las decisiones importantes. **Si hay que tomar una decisión importante, preguntar antes.**
2. **Antes de instalar cualquier paquete, explicar en una frase para qué sirve.**
3. Trabajar por fases y hacer **un commit de git al terminar cada fase**:
   (1) base, sistema de diseño, logo y navegación ✅ · (2) inicio y fichas de kit ✅ ·
   (3) configurador ✅ · (4) carrito y compra simulada ✅ · (5) login, activación y cursos ✅ ·
   (6) repaso final de calidad ✅.
4. Al terminar cada fase: decir exactamente qué comandos ejecutar, qué dirección abrir y qué debería verse.
5. `npm run lint` y `npm run build` deben pasar sin errores antes de cada commit.
6. Componentes pequeños y reutilizables, tipos de TypeScript y **comentarios en español** en las partes clave.
7. Secretos solo en `.env` (nunca en git). `.env.example` sin secretos.
8. **No borrar ni modificar `imagenes/`** (originales del usuario). Sí se guarda en git.
9. Sin logos, nombres, textos, imágenes ni tipografías de Apple o McDonald's: solo la inspiración de estilo.

## Marca y sistema de diseño

- Logo original: `imagenes/logo.png` (negro #0B0B0B sobre blanco, sin transparencia, trazos muy finos).
- Versiones web en `public/images/brand/`: `logo.svg` (redibujo vectorial, negro), `logo-blanco.svg`,
  `logo.png` (copia), `logo-negro.png` / `logo-blanco.png` (recortados, transparentes), `monograma.svg` ("V" para iconos).
- `npm run marca` regenera las copias PNG, el favicon y los iconos (`scripts/generar-marca.mjs`).
- Usar siempre el componente `<Logo fondo="claro|oscuro" />`, con al menos 14 px de alto.
- **Todos los tokens** (colores, tipografías, radios, sombras) están en `src/app/globals.css` (`@theme` de Tailwind 4).
  - Tinta #0B0B0B · Grafito #1A1A1A · Niebla #F4F4F2 · Gris #6B6B6B · Gris claro #A1A1A1 · Línea #D9D9D6
  - Acento "Azul circuito" #2D4BFF (hover #1F3AE0) · sobre fondo oscuro #7A8CFF
  - Éxito #157A42 · Aviso #B45309 · Error #D92D20
  - Tipografías: Jost (titulares, `font-titulo`) e Inter (texto, `font-sans`), vía `next/font`.
- Nombre, lema y enlaces de navegación/pie: `src/config/marca.ts`.
- Página interna de referencia: `/diseno`.

## Tecnología y versiones

- Next.js 16.4.1 (App Router, Turbopack) · React 19.3.1 · TypeScript 6.0 (typescript-eslint aún no admite la 7)
- Tailwind CSS 4.3 · Zustand 5 (carrito en localStorage) · lucide-react (iconos)
- ESLint 9 (eslint-config-next aún no admite ESLint 10) + Prettier 3 (con plugin de Tailwind)
- Prisma 7.10 estable (el tag "latest" de npm apunta a una 8.0 rc: no actualizar sin preguntar).
  - Config en `prisma.config.ts` (carga .env con dotenv; Prisma 7 no lo hace solo). Generador `prisma-client` → `src/generated/prisma` (ignorado en git; se crea en postinstall/build).
  - SQLite local en `prisma/dev.db` (`DATABASE_URL="file:./prisma/dev.db"`) con `@prisma/adapter-better-sqlite3`. Cliente único en `src/lib/db.ts` (import "server-only").
  - `migrate dev` NO genera el cliente ni ejecuta el seed en Prisma 7: usar `npm run db:generate` / `npm run db:seed`.
  - Para PostgreSQL: provider + adaptador (`@prisma/adapter-pg`) en db.ts y seed.ts + migraciones nuevas (ver README).
  - Seed (`prisma/seed.ts`, con tsx) valida `data/*.json` con Zod (`src/lib/validaciones/catalogo.ts`, mensajes en español). En los JSON los precios van en euros; en la BD, en céntimos.
- Zod 4 · qrcode (QR en SVG con corrección "H" y monograma en el centro) · Auth.js v5 beta (next-auth@5.0.0-beta.32) con email y contraseña cifrada (bcryptjs).
- Las páginas de kits se generan estáticas en el build leyendo la BD: `npm run build` necesita la BD creada (`npm run setup`).
- Animación al hacer scroll: clase CSS `aparecer` (scroll-driven animations, sin JS; respeta prefers-reduced-motion).
- En Windows, al parar `next dev` lanzado en segundo plano, comprobar que el puerto 3000 queda libre (el proceso hijo puede sobrevivir).
- Next 16: el antiguo `middleware.ts` se llama `proxy.ts`.
- Alias de importación: `@/` = `src/`.

## Estructura

```
imagenes/              originales del usuario (no tocar)
public/images/         brand/, componentes/, kits/
scripts/               generar-marca.mjs
src/app/               (tienda)/, (auth)/, (cuenta)/, activar/, api/, diseno/
src/components/        ui/, layout/, marca/, tienda/, configurador/, compra/, cuenta/, cursos/
src/config/            marca.ts, categorias.ts
src/lib/               db.ts, catalogo.ts, pedidos.ts, codigos.ts, qr.ts, fichaTecnica.ts, utils.ts, validaciones/, compatibilidad/, pagos/, sesion.ts, cursos.ts, activacion.ts, video.ts, limite.ts (+ src/auth.ts, src/auth.config.ts, src/proxy.ts)
src/generated/prisma/  cliente de Prisma generado (no editar, no se sube a git)
data/                  componentes.json, kits.json, cursos.json (fuente de los datos de prueba)
prisma/                schema.prisma, migrations/, seed.ts, dev.db
src/store/             carrito.ts, configurador.ts
src/types/
```
