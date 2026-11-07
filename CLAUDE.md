# Valentia — contexto para Claude

Lee también `AGENTS.md` (lo genera Next.js): esta versión de Next.js (16) tiene cambios
importantes; consulta `frontend/node_modules/next/dist/docs/` antes de usar APIs que no conozcas.

**El repositorio tiene dos carpetas: `frontend/` (la web Next.js: `src/`, `public/`, `prisma/`, `data/`, `scripts/`, `e2e/`,
`.env`) y `backend/` (la API).** Todas las rutas de este documento son relativas a `frontend/`, salvo `backend/`, `imagenes/`,
`documentos/` y los `.md`, que están en la raíz. Los comandos `npm` se ejecutan dentro de `frontend/`; la raíz solo tiene un
`package.json` que redirige (`dev`, `backend`, `test`, y los que usa Render: `db:push`, `build`, `start`, `predeploy:prod`). El Build
Command real de Render incluye `db:push`, que va antes de `build`: por eso instala `frontend` primero.
**No quitarlo: gracias a él Render publica la web sin cambiar su configuración.**

## Estado del proyecto

> Actualizar esta sección al terminar cada fase.

**Las 6 fases, el panel de administración, la verificación por email y la FASE DE LANZAMIENTO (10 bloques) están
terminados, y la base de datos ya es MongoDB Atlas (hosting previsto: Render).** Lo que falta para publicar lo tiene
que hacer el usuario: lista en `INFORME.md` §3 y guía `DESPLIEGUE.md`. No empezar trabajo nuevo grande sin su aprobación.

### Separación backend (Render) y frontend (Vercel) (06-11-2026, rama `feature/backend-render`) — EN CURSO

Decisión del usuario: **separación total**, sabiendo que es una migración grande. Se hace por fases; la web real no se mueve
hasta que todo esté probado.

- [x] Fase 1: `backend/` (Hono, puerto 4000, `npm run backend`) con `POST /v1/guiones` para n8n, token `N8N_API_TOKEN`
      (`backend/README.md`, DESPLIEGUE.md §6 ter). Lógica en `src/lib/contenido/recibirGuion.ts`: borrador + origen IA, nunca
      llega a un editor sin aprobar. tsx con `--conditions=react-server` para que `server-only` no falle fuera de Next.
- Decisión del usuario: **un solo servicio de pago en Render**. Hoy n8n llama a la web: `POST /api/v1/guiones`
      (`src/app/api/v1/guiones/route.ts`). `backend/` no se publica aún; comparte `src/lib/contenido/apiGuiones.ts`.
      Al pasar la web a Vercel, Render ejecutará solo `backend/` y n8n cambiará de dirección. No crear un segundo servicio.
- [x] Carpetas: `frontend/` y `backend/`, cada una con su `package.json`. El backend aún importa la lógica de
      `frontend/src` (alias `@/`), por eso su build instala también `frontend`. Prisma fijado a 6.19.3 sin `^`.
- [ ] Siguientes fases: mover a `backend/`, módulo a módulo, las lecturas y las 55 acciones (72 páginas leen la BD), y al
      final la web a Vercel sin Prisma. Antes hace falta fotos en la nube (R2), y Vercel Pro por ser comercial. La web
      hablará con el backend desde su servidor (la cookie de sesión sigue en su dominio).
- n8n (cron diario + ChatGPT que analiza noticias y genera el guion) es para iterar: cuando funcione bien, pasará a un
  módulo del backend, llamando a `recibirGuion`.

### Tarjetas de bienvenida (07-11-2026, rama `claude/project-thread-ez0n8b`)

Para la presentación de Jesse: tarjetas láser con QR que llevan a registrarse y ver el vídeo de bienvenida. Son códigos
normales del kit gratis `bienvenida-valentia` (`SLUG_KIT_BIENVENIDA` en `src/config/bienvenida.ts`): uno distinto por
tarjeta (para contar personas) y solo abren ese curso.

- `/admin/codigos` → caja «Tarjetas de bienvenida»: número + «Descargar ZIP de bienvenida» (`DescargaBienvenida` →
  `POST /admin/codigos/bienvenida`: crea el lote y devuelve el ZIP; solo ADMIN y misma web). Cifras: tarjetas hechas
  y personas registradas (`resumenBienvenida`). ZIP con el mismo formato y nombre (`tarjetas-laser-<slug>-…`) que los
  de los kits: `src/lib/tarjetaLaser/zipLote.ts` (lo usan las dos descargas).
- Diseño (`tarjeta.ts`, si `slugKit` es el de bienvenida): delante QR + el cuadrado de la V (como el icono) con pistas de circuito,
  «BIENVENIDOS A» + logo; detrás pasos, caja con el código (cambia en cada tarjeta) y dirección.
- `/activar` con código de bienvenida y sesión: se activa solo y redirige a `/cursos/bienvenida-a-valentia`.
  Kit gratis: si ya tenía el curso, el código se gasta igual para contarle (salvo que ya usara otra tarjeta).
- Vídeo: sigue `PENDIENTE`; se pone en `/admin/cursos` (lección «Te damos la bienvenida»).
- `/admin/codigos/personas` (enlace «Ver lista» de la caja): quién se registró con tarjeta y botón «Borrar» con
  confirmación (`src/lib/admin/bienvenida.ts`). Solo clientes sin pedidos ni códigos de otros kits (`motivoNoBorrar`);
  al borrar, su tarjeta queda libre otra vez y deja de contar.

### Revisión antes de abrir la tienda (06-11-2026, rama `claude/project-thread-tdljxs`)

- Recorridas 45 páginas públicas (móvil y ordenador): sin enlaces rotos, errores ni desbordes.
- La tarjeta de muestra de la portada (`TarjetaQRMuestra`) ya no va dentro del HTML: son imágenes
  `/tarjeta-muestra/<cara>.svg` (`src/app/tarjeta-muestra`, `src/lib/tarjetaLaser/muestra.ts`), generadas al compilar.
  La portada pasaba de 1,4 MB de HTML por los trazados del láser (salían dos veces).
- Con la tienda cerrada, los botones «Comprar» de la portada dicen «Avísame cuando abra».
- Jesse: montaje «plug & play» (se enchufa, encaja o va con imanes). Coche y brazo van con **portabaterías de dos
  baterías recargables 18650** (incluidas), no con pilas AA: cambiado en el coche 3D (`modeloCoche.ts`, a petición
  suya), su foto (`fotos:piezas -- --kits`), la trasera láser del coche y las preguntas frecuentes. El brazo usa
  servos de alto par (MG996R). Las piezas de cada kit se cambian en el panel (la BD manda).

### Editores y guiones de marketing (05-11-2026, rama `feature/editores-guiones`)

Rol `EDITOR` y sección «Contenido». Decisiones del usuario: **el editor se registra como cualquier usuario y el admin
le da el rol** desde `/admin/usuarios` (no hay alta de editores); el guion solo lo corrige el admin y antes de asignarlo.

- Flujo y permisos como datos en `src/config/estadosGuion.ts`; base de datos en `src/lib/contenido/guiones.ts` (todo cambio
  de estado va con su `CambioEstadoGuion` en una transacción). `crearGuion` es la única entrada: la fase 2 («Generar
  borrador con IA», NO hecha) la llamará con origen `IA`.
- Corregir: `APROBADO`/`PENDIENTE_APROBACION` → `BORRADOR`; el texto solo se edita en borrador o pendiente. Reasignar: mientras
  esté asignado o en progreso. No se quita el rol con guiones activos (`ESTADOS_ACTIVOS`).
- Permisos: `exigirEditor` / `exigirEditorEnAccion` (`sesion.ts`), con el mismo patrón que admin: en layout, cada página y
  cada acción; el rol sale de la BD. `proxy.ts` solo exige sesión en `/editor`. Las lecturas del editor siempre filtran por su
  id. `/editor` es solo para EDITOR (un ADMIN recibe 404: lo ve todo en `/admin/contenido`).
- Métricas: `src/lib/contenido/metricas.ts` (puro; `editorId` del historial: al reasignar cada uno conserva lo suyo). Solo en
  `/admin/contenido/metricas`.
- Categorías: `CategoriaGuion`; la lista inicial se crea sola la primera vez que se piden (`categoriasGuion`). Nunca se
  borran, se desactivan. Sin variables nuevas en Render; `db push` del Pre-Deploy crea las colecciones.
- `MenuAdmin` sirve para las dos zonas (`zona="editor"`). Formularios con `guionId`, no `id` (aviso de Playwright).
- Pruebas: `estadosGuion.test.ts`, `guion.test.ts`, `metricas.test.ts`, `guiones.test.ts` (reglas del servidor, BD simulada)
  y `e2e/editores-guiones.spec.ts`.

### Kit gratis de bienvenida (05-11-2026, rama `valentiarobotics/kit-bienvenida`)

Decisión del usuario: un kit de 0 € sin piezas, con un curso de un solo vídeo de bienvenida (`bienvenida-valentia`,
curso `bienvenida-a-valentia`; vídeo `PENDIENTE`: ponerlo en `/admin/cursos`). Sale en `/kits` con el precio «Gratis»
(`precioDeKit`) y funciona aunque la compra esté cerrada.

- Gratis = `precioCentimos === 0` y sin piezas (las validaciones del panel y del catálogo exigen las dos cosas juntas).
- Botón «Conseguir gratis» → `conseguirKitGratis` (`kits/[slug]/acciones.ts`) → `activarKitGratis` (`activacion.ts`):
  sin sesión manda al login y vuelve a la ficha; con sesión crea el `CursoUsuario` y lleva al curso. Sin pedido, código
  ni pago; el precio se comprueba en el servidor y repetir no duplica nada.
- Un kit gratis no sale en la portada, en sus cifras ni en el configurador; `crearPedido` lo rechaza; su ficha no lleva
  caja, reseñas (`puedeOpinar` exige código) ni envío en los datos para Google.
- Llega a producción con `data/catalogo/` (seed:prod solo crea: kit, curso y lección). Imágenes hechas a mano:
  `public/images/kits/bienvenida-valentia.svg` y `public/images/redes/kits/bienvenida-valentia.png` (sin modelo 3D).
- Pruebas: `src/lib/validaciones/kitGratis.test.ts` y `e2e/kit-gratis.spec.ts`.

### Desactivar códigos en bloque (05-11-2026, rama `claude/project-thread-df82fa`)

`/admin/codigos`: botones «Desactivar todos» / «Reactivar todos» (con confirmación) encima de la tabla; actúan sobre
los códigos de los filtros que se ven (kit, lote, estado, búsqueda; sin filtros = todos). Acción
`cambiarDesactivacionTodos`, lógica `cambiarDesactivacionEnBloque` en `src/lib/admin/codigos.ts` (updateMany).
También casillas en cada fila (07-11-2026, rama `claude/project-thread-k1gipq`): «Marcar todos» (la página), Mayúsculas + clic
marca un tramo, «Desactivar/Reactivar seleccionados» con confirmación (`SeleccionCodigos`, igual que `AccionesLotePedidos`;
acción `cambiarDesactivacionSeleccionados` → `cambiarDesactivacionDeIds`, máx. 200).

### Fluidez en el móvil (30-10-2026, rama `claude/project-thread-2xc9gb`)

- Coche 3D: `fusionarMallas.ts` junta las mallas de cada pieza que comparten material (475 → 193 órdenes de
  dibujo por fotograma, mismo aspecto). `crearEscenaRobot` es ASYNC: se prepara a trozos (`ceder`) y compila
  los shaders con `compileAsync` (el primer fotograma ya no congela la página). Móvil: pixelRatio 1,5.
- `PortadaRobot`: `--e` y `data-pieza-activa` solo con el dibujo SVG (cambiar `--e` en cada fotograma
  recalculaba los estilos de toda la portada). El imán del scroll solo con ratón (`pointer: fine`).
- Barra de navegación: `backdrop-blur-md` + `bg-white/85` en el móvil (xl en ordenador).

### Guías y fichas de componentes (30-10-2026, rama `claude/project-thread-g3cf1v`)

- `/guias` y `/guias/[slug]`: artículos en `src/config/guias.ts` (`[texto](/ruta)` = enlace; `kits`/`componentes` salen
  al final; test `guias.test.ts` comprueba enlaces y slugs). Article + BreadcrumbList; enlazadas desde el pie, la
  ficha de cada kit y la de cada componente (`GuiasRelacionadas`). Guía nueva → cambiar `actualizada`.
- `/componentes/[slug]`: ficha de cada pieza (`obtenerComponentePorSlug`, Product con `datosComponente`, kits que la
  llevan, parecidos). Foto para Google/redes en `public/images/redes/componentes/<slug>.jpg` (la escribe `fotos:piezas`).
- Las tarjetas opengraph-image de rutas dinámicas llevan un código en la URL (`opengraph-image-xxxx`): no
  enlazarlas a mano (en sitemap o JSON-LD dan 404); usar las fotos de `public/images/redes/`.

### SEO a fondo (30-10-2026, rama `claude/project-thread-g3cf1v`)

- Títulos y descripciones con lo que busca la gente (kits de robótica para montar, Arduino, ESP32, regalo);
  `marca.lema`/`descripcion` nuevos; `lang="es-ES"`; `googleBot` con `max-image-preview: large`.
- Datos estructurados: `OnlineStore` (zona de envío, devoluciones), WebSite con `alternateName`, Product con
  categoría y edad mínima, BreadcrumbList en /kits, /componentes, /configurador y preguntas frecuentes.
- sitemap con fotos (PNG de los kits y tarjetas para compartir); sin `lastModified` (cambiaría cada 5 min).
- Bing: IndexNow automático al arrancar en Render (`src/instrumentation.ts` → `src/lib/indexnow.ts`, clave en
  `public/<clave>.txt`; log `[indexnow]`). Verificación por etiqueta opcional con `BING_VERIFICACION`.

### Kits modulares en las fotos (30-10-2026, rama `claude/project-thread-g3cf1v`)

Decisión de Jesse: los kits se presentan MODULARES (las piezas no cambian): se unen con imanes y pines pogo
(`conectorImantado` en `modelos.ts`) y solo lo que no se puede imantar (servos, motores, pilas) lleva cables
JST blancos; sin cables Dupont. `MODELOS[slug].construir(t, { modular: true })`
quita los cables sueltos (servo con JST, portapilas y protoboard sin cables). Brazo (Jesse, 30-10-2026, según su foto de referencia): pie de 4 patas en cruz y columna, 6 articulaciones con tambores (servo dentro) y piezas laterales con tapas atornilladas, antebrazo que gira sobre sí mismo, pinza de dos dedos planos y gruesos que abren en paralelo; PLA negro mate, sin logos (`brazoImpreso`). Estación: caja propia (`cajaEstacion`) con pantalla, interruptor y
USB-C; los sensores se pegan con imanes a sus lados. El coche se queda como estaba (Jesse, 30-10-2026).

### SEO, imágenes para compartir y fluidez (30-10-2026, rama `claude/project-thread-g3cf1v`)

- Cada página pública usa `metadatosPagina` (`src/lib/metadatos.ts`: título, descripción, canonical, Open Graph y
  Twitter completos; Next no hereda el openGraph del layout si la página pone el suyo).
- Imagen al compartir (WhatsApp, TikTok…): `src/app/opengraph-image.tsx` (portada y resto) y
  `kits/[slug]/opengraph-image.tsx`, con `TarjetaRedes` (`src/lib/imagenRedes.tsx`) y la foto PNG del kit de
  `public/images/redes/kits/` (satori no lee SVG). Fotos de kits: `npm run fotos:piezas -- --kits` (`KITS` en
  `modelos.ts`; también reescribe `public/images/kits/<slug>.svg`). Kit nuevo → añadir su modelo.
- Datos estructurados: Product con imagen PNG, `shippingDetails` y `hasMerchantReturnPolicy` (de `tienda.ts`),
  BreadcrumbList en la ficha e ItemList en /kits.
- Fluidez: utilidad `diferido` (content-visibility) en las secciones bajas de la portada; transiciones solo de
  opacity/translate; menos desenfoque en el móvil; tarjetas del configurador entran con `animate-tarjeta` al
  cambiar de categoría (key en el `<ul>`).

### Fotos 3D de las piezas y acercamiento en la portada (29-10-2026, rama `claude/project-thread-g3cf1v`)

- Portada: al explicar cada pieza, la cámara se acerca a ella (`encuadres` en `escenaRobot.ts`, por la misma
  dirección; el modelo del coche NO se toca: a Jesse le encanta). El lienzo lleva los bordes difuminados (mask-image).
- Configurador: las 18 fotos de `public/images/componentes/*.svg` son fotos de estudio en 3D (WebP dentro del SVG,
  mismas rutas → nada que cambiar en la BD). Se regeneran con `npm run fotos:piezas` (`scripts/fotos-piezas/`:
  `modelos.ts` una función por slug, `estudio.ts` luz y cámara como la portada; `-- --prueba` deja PNG en
  `.fotos-prueba/`). Usa el Chrome del sistema (o `CHROME_RUTA`). Pieza nueva → añadir su modelo.
- Móvil y tablet (< lg): también robot 3D con scroll (sección pegajosa con `svh`, lienzo a todo el ancho,
  tarjeta `PiezaMovil` con la pieza activa; sombras ligeras). Con «reducir movimiento» sigue la lista y el SVG.

### Robot 3D realista de la portada (29-10-2026, rama `claude/project-thread-g3cf1v`)

`modeloCoche.ts` (piezas reales del kit del coche: metacrilato, placa UNO, protoboard, L298N, motores TT, HC-SR04,
sensores de línea, portapilas 4×AA y cables que se desvanecen al despiezar) + `texturasRobot.ts` (serigrafías en
canvas, sin imágenes). `escenaRobot.ts`: RoomEnvironment (reflejos), sombras, ACES; la pieza activa se aclara con
su propio color. En el móvil sigue el dibujo SVG (`RobotEstatico`).

### Diploma y preguntas frecuentes (29-10-2026, rama `claude/project-thread-g3cf1v`)

- Diploma: `/cursos/[slug]/diploma` (solo con todas las lecciones hechas; `obtenerDiploma` en `src/lib/cursos.ts`),
  componente `cursos/Diploma` (nombre editable, A4 apaisado con `@page`, «Descargar en PDF» = `window.print()`,
  tamaños en `cqw`). Enlaces en `TarjetaCurso` y `TemarioLateral` al terminar.
- `/preguntas-frecuentes`: textos en `src/config/preguntas.ts` (envíos/devoluciones desde `tienda.ts`; la pregunta
  «¿Cuándo se podrá comprar?» solo con la tienda cerrada), FAQPage en datos estructurados, pie y sitemap.

### Estadísticas de visitas (27-10-2026, rama `claude/project-thread-g3cf1v`)

Propias, sin cookies ni IP: `ContadorVisitas` (en `Proveedores`; no cuenta ADMIN ni `navigator.webdriver`) →
`POST /api/visitas` (robots fuera, límite `visita` por IP, huella diaria HMAC(AUTH_SECRET) de IP+navegador+día,
borra lo de > 400 días) → modelo `Visita`. Reglas puras en `src/lib/visitas/reglas.ts` (+ test). Panel
`/admin/visitas` (`src/lib/admin/visitas.ts`, `PanelVisitas`): 7/30/90 días, personas, páginas, origen
(`?utm_source=` manda), aparato. Fila nueva en privacidad (interés legítimo) y frase en cookies.

### Lista de espera (27-10-2026, rama `claude/project-thread-g3cf1v`)

Mientras `compraAbierta()` sea falso (claves de prueba en producción), la portada (`AvisoApertura` bajo el robot y `BloqueFinal`), la ficha de
cada kit y el checkout muestran `FormularioAvisame` (`src/components/espera/`, acción `src/app/(tienda)/listaEspera.ts`,
honeypot `web`, límite `listaEspera` por IP). Modelo `ListaEspera` (email único). Panel `/admin/lista-espera`
(copiar emails para CCO, CSV, borrar). Fila nueva en la política de privacidad. Textos sencillos, sin tono
de anuncio (lo pidió Jesse).

### Google y reseñas (24-10-2026, rama `claude/project-thread-k6zvn1`, PR #20)

- Search Console verificado con `public/googlef2ee1364afad6701.html` (no borrarlo). Favicon = `monograma.svg`.
- Datos estructurados (`src/lib/datosEstructurados.ts` + `components/seo/DatosEstructurados`): Organization +
  WebSite en la portada; Product en cada ficha (InStock solo si `compraAbierta()`), con `aggregateRating` y
  `review` cuando hay reseñas publicadas. Canonical en las fichas. sitemap sin /login ni /registro.
- Reseñas (decisión de Jesse: solo quien activó el código del kit, salen al momento, ocultables): modelo
  `Resena` (una por usuario y kit, `EstadoResena` PENDIENTE/PUBLICADA/OCULTA), reglas en `src/config/resenas.ts`,
  consultas en `src/lib/resenas/`, acciones en `src/app/(tienda)/kits/[slug]/acciones.ts` (la ficha es ISR:
  el formulario pide `leerMiResena` al cargar), panel `/admin/resenas`. Nombre público «Ana G.».

### Catálogo de producción desde el panel (20-10-2026, rama `valentiarobotics/catalogo-solo-crear`)

Decisión del usuario: el catálogo de producción se gestiona desde el panel de producción. `seed:prod` SOLO
crea lo que no existe; nunca modifica lo existente (ni stock) ni añade piezas/lecciones/ejercicios a un kit,
curso o lección que ya existía (`DUENA` en `src/lib/catalogoProduccion.ts`). Sigue sin borrar y sin recrear lo
borrado en el panel (`CatalogoAplicado`; tipos de operación `crear` | `registrar`). DESPLIEGUE.md §6 bis.

En el mismo PR, arreglo de «Cerrar sesión»: `signOut` de next-auth/react consulta `/api/auth/session` justo
después (BroadcastChannel) con la cookie vieja y el servidor la volvía a crear (seguías dentro). Ahora el evento
`signOut` de `src/auth.ts` apunta `DispositivoConfianza.sesionCerradaEn` y `comprobarSesion` rechaza los JWT con
`abiertaEn` (se pone al iniciar sesión) anterior. El navegador sigue siendo de confianza: al volver a entrar no
pide código. (El «código pedido otra vez» que contó el usuario no se reprodujo en local: pendiente de saber dónde.)

Seguía fallando en la web real: en Render las rutas `/api/auth` ven la dirección interna `https://localhost:10000`
y «Cerrar sesión» redirigía allí (error en el navegador). `src/auth.config.ts` pone `AUTH_URL` =
`NEXT_PUBLIC_SITE_URL` en producción si no existe (Auth.js lo lee en cada petición). Comprobar con
`curl` a `/api/auth/csrf`: la cookie `callback-url` debe llevar el dominio real, no `localhost:10000`.

### Puesta a punto final (19-10-2026, rama `valentiarobotics/puesta-a-punto`; instrucciones en `PUESTA_A_PUNTO.md`)

Rama desde `main` + PR #9 unido dentro (health, db:check, aviso de Turbopack). El PR #10 (`catalogo:copiar`,
conectaba a prod desde el ordenador) queda sustituido por `seed:prod`. NUNCA conectar a valentia-prod desde aquí
ni tocar `.env`. Pruebas con BD temporales en valentia-dev (borrarlas al terminar).

- [x] 1. Depuración: lint, tipos, build, Vitest, Playwright; recorrido de todas las páginas (escritorio y móvil),
      estados vacíos, npm audit. Hecho: `e2e/todas-las-paginas.spec.ts` + `e2e/recorrer.ts` (sigue enlaces: 23
      públicas, 11 de cuenta, 120 del panel; consola, HTTP ≥ 400, imágenes rotas, desbordes en móvil; usar
      `waitForLoadState("load")`, NO "networkidle": las precargas de Next lo cuelgan). Sin errores encontrados.
      BD vacía: nada se rompe; añadido `ui/EstadoVacio` en /kits y /componentes. Portada, /kits, /kits/[slug],
      /componentes y sitemap con `revalidate = 300` (el catálogo cargado tras el build aparece solo; probado).
      Next 16.4.2, postcss, lucide-react. npm audit: 8 altos sin arreglo seguro (eslint-config-next y CLI de Prisma).
- [x] 2. Catálogo: `catalogo:exportar` → `data/catalogo/*.json` (EJSON canónico, ids y tipos exactos;
      `promoteValues: false`), `seed:prod` idempotente (nunca borra; desde el 20-10 solo crea), `predeploy:prod` (db push SIN
      --accept-data-loss + seed), `prod:admin` (`scripts/consola.ts`: entrada oculta; por tubería en pruebas).
      Lógica en `src/lib/catalogoProduccion.ts` (+11 tests): memoria `CatalogoAplicado` (huella por ficha) → no
      pisa lo editado en el panel si el JSON no cambió, no recrea lo borrado en el panel, nunca toca `stock` de
      lo que existe, reconoce por slug (Ejercicio: lección + orden) lo cargado con otros ids. Probado en BD
      temporales (flujo Render: build vacío → predeploy ×2 → la web muestra el catálogo a los 5 min; otros ids,
      panel, borrado, cambio en JSON, URL mala) y login real del admin creado. BD de prueba borradas.
- [x] 3. Documentación: DESPLIEGUE.md (Pre-Deploy, Health Check, prod:admin, §6 bis reexportar catálogo),
      README, INFORME.md (§0 puesta a punto), CLAUDE.md.
- [x] 4. Final (20-10-2026): lint, tipos, build, Vitest (94) y Playwright (11) en verde; graphify; commit,
      push y PR hacia main (lo une el usuario). La BD real se llena sola con el Pre-Deploy de Render.

### Arreglo del despliegue en Render (19-10-2026, rama `valentiarobotics/arreglar-despliegue-render`)

- Causa del «Timed Out»: no existía `/api/health` (Health Check Path de Render → 404). Ahora
  `src/app/api/health/route.ts`: sin parámetros responde al instante SIN tocar la BD; `?db=1` hace ping con
  límite de 4 s → 503 + motivo en los logs (`[health]`), sin contraseñas. El proxy no pasa por `/api`.
- `src/lib/diagnosticoBD.ts` (+ test): `revisarDireccion`, `explicarErrorBD`, `ocultarSecretos`, `conTiempoLimite`.
  `npm run db:check` (`scripts/comprobar-bd.ts`): formato → driver de MongoDB → Prisma, con explicación en español.
- «tlsv1 alert internal error» / «fatal alert: InternalError» = Atlas corta la conexión cifrada porque la IP no
  está en Network Access del proyecto del clúster (o clúster en pausa). Pasó en local con `valentia-dev` (la entrada
  de la IP del usuario no se aplicaba; con `0.0.0.0/0` temporal conectó). La 1.ª conexión de Prisma desde España
  tarda ~5 s (el primer `?db=1` puede dar `tiempo-agotado`).
- `engines.node` = `24.x`; `binaryTargets = ["native", "debian-openssl-3.0.x"]`; `npm start` sin `-H` (Next ya
  escucha en todas las interfaces; con `-H 0.0.0.0` el callbackUrl del login salía con `0.0.0.0`).
- `local.ts`: `path.resolve(/* turbopackIgnore: true */ process.cwd(), …)` quita el aviso de Turbopack.

### Migración a MongoDB Atlas + Render (19-10-2026, rama `valentiarobotics/migrar-mongodb`; TERMINADA, unida a main)

Decisión del usuario: MongoDB Atlas (M0) en lugar de PostgreSQL, y Render en lugar de Vercel (el PR #2 de Vercel
queda obsoleto). Prisma 7 no admite MongoDB → Prisma **6.19.3**.

Análisis (lo que se ve afectado):

- **Prisma 7 → 6.19.3**: sin adaptadores de conexión (MongoDB usa el motor de Prisma): fuera
  `@prisma/adapter-better-sqlite3`, `@prisma/adapter-pg`, `better-sqlite3`, `src/lib/adaptadorBD.ts`. `url` vuelve al
  `datasource` del esquema. Revisar `prisma.config.ts`, el generador y los imports (`@/generated/prisma/client|enums`,
  30 archivos, 2 componentes de cliente importan enums).
- **Ids**: `cuid()` → `ObjectId` (`@id @default(auto()) @map("_id") @db.ObjectId`) y todas las FK con `@db.ObjectId`.
  `EventoStripe.id` (evt_…) y `LimiteIntento.id` siguen siendo texto propio (`@map("_id")`). Un id mal formado hace
  que Prisma lance error → las 10 páginas con `[id]` y las acciones con ids deben validarlo (404, no 500).
- **Claves compuestas** (`@@id`, no existen en MongoDB): `KitComponente`, `CursoUsuario`, `ProgresoLeccion`,
  `VideoVisto`, `ResultadoTest`, `ProgresoEjercicio` → id propio + `@@unique([…])` (mismo nombre de clave compuesta:
  `usuarioId_cursoId`… las consultas no cambian).
- **Únicos opcionales** (MongoDB no admite varios null en un índice único): `Pedido.referenciaPago` y
  `DispositivoConfianza.paseHash` → índice normal (`paseHash` se busca con findFirst; es un hash aleatorio).
- **Únicos que se mantienen**: email, código de activación, número de pedido, slugs (componente, kit, curso,
  lección por curso), tokenHash (verificación y dispositivo), `Kit.cursoId`.
- **Tipos**: dinero ya en céntimos (`Int`), enums y fechas existen en MongoDB, `Json` y `Float` también.
- **Transacciones** (11): MongoDB Atlas es un replica set → `$transaction` funciona; los conflictos de escritura
  (P2034) se reintentan. Críticas: confirmar pago, reservar/devolver stock (`updateMany` con `stock gte`), generar
  códigos, canjear código (`updateMany ... usadoEn: null`), verificar códigos de correo. Latencia de Atlas: subir el
  `timeout` de las transacciones largas (seed).
- **Búsquedas**: `textoContiene` pasa a `mode: "insensitive"` siempre (MongoDB lo admite).
- **Agregaciones** (`groupBy`, `aggregate`, `_count`): funcionan igual en MongoDB.
- **Borrados en cascada / SetNull**: Prisma los emula en MongoDB (solo vía Prisma).
- **Auth.js**: NO usa adaptador de base de datos (sesión JWT + Credentials; usuarios y dispositivos son tablas
  propias): no hay adaptador que cambiar; se prueba el flujo completo.
- **Migraciones**: MongoDB no tiene → se borran `prisma/migrations`, `prisma/postgresql`,
  `scripts/esquema-postgres.mjs`; `prisma db push` crea colecciones e índices.
- **Seed**: hoy el seed SÍ puede ejecutarse en producción → separar catálogo (producción) y datos de prueba
  (desarrollo, bloqueado con `NODE_ENV=production` o en Render).
- **Scripts**: `hacer-admin.ts`, `fotos-a-la-nube.ts`, `e2e-preparar.mjs` (usaba better-sqlite3 → BD `_e2e` en Atlas).
- **Copias de seguridad**: M0 no tiene → scripts de copia y restauración (EJSON, conserva tipos).
- **Datos locales**: `prisma/dev.db` no se borra (queda sin usar); el clúster de desarrollo empieza vacío.

Pasos:

- [x] 1. Prisma 6.19.3, esquema MongoDB, `db push` y cliente generado.
- [x] 2. Código: ids válidos (`src/lib/ids.ts`), búsquedas, únicos, `transaccion()` con reintento (`db.ts`) y
      campos opcionales guardados como null al crear (`src/lib/nulos.ts`: sin esto `usadoEn: null` no encuentra nada).
- [x] 3. Seed: `prisma/catalogo.ts` (compartido), `npm run db:catalogo` (producción) y `db:seed` (desarrollo,
      bloqueado en producción); `npm run admin`; `db:copia` / `db:restaurar` (paquete `mongodb`, EJSON, carpeta
      `copias/` fuera de git); e2e en la base de datos `valentia_e2e`.
- [x] 4. Pruebas contra Atlas: lint, build, Vitest (54), Playwright (8) + revisión temporal (QR, código usado,
      panel completo, búsquedas, lotes, pedidos, lecciones, recuperar contraseña, ids raros: 12 en verde) y
      concurrencia (8 compras de 1 unidad → 1; 6 canjes del mismo código → 1).
- [x] 5. DESPLIEGUE.md (Render + Atlas), `.env.example`, README, INFORME.md, SEGURIDAD.md, graphify y pull request.

### Fase de lanzamiento (17-10-2026, `551a1f4` … `Lanzamiento (10/10)`; decisiones en INFORME.md)

Un commit por bloque («Lanzamiento (n/10)»).

- [x] 1. Configuración del negocio: `src/config/tienda.ts` (zona CP 03/46/12, envío 4,95 € / gratis ≥ 50 €, IVA 21 %,
      datos de empresa como `[RAZÓN SOCIAL]`…), cálculo de totales puro en `src/lib/precios.ts`, desglose en carrito/checkout.
- [x] 2. Portada visual: robot 3D con `three` (carga diferida, se despieza con el scroll), versión estática en
      móvil/equipos lentos/reduced-motion, animaciones de entrada por sección.
- [x] 3. Navegación: sección activa visible (Inicio, Kits…, subpáginas) en escritorio, menú móvil y panel.
- [x] 4. Cursos: «Hacer el test» se desbloquea al terminar el vídeo (YouTube IFrame API, Vimeo Player SDK, <video>);
      pantalla `/cursos/[slug]/[leccion]/test` pregunta a pregunta, puntuación, explicaciones, repetir, guardar resultado.
- [x] 5. Checkout y pagos: Stripe Payment Element (claves de prueba) + webhook firmado e idempotente; modo simulado sin
      claves («Confirmar pago de prueba»); envío con teléfono y provincia, CP de la zona; direcciones guardadas e invitado;
      stock reservado al crear y liberado si falla; códigos + correo de confirmación con IVA al pagar; panel de pedidos
      (estados, seguimiento, correo al enviar); historial en Mi cuenta; `/pedido/[id]` protegido.
- [x] 6. BD lista para PostgreSQL (SUSTITUIDO por MongoDB el 19-10-2026) y almacén de
      fotos en la nube S3/R2 cambiando solo la configuración.
- [x] 7. Páginas legales (BORRADOR) + banner de cookies (vídeos de terceros solo con consentimiento) + aceptación en checkout.
- [x] 8. Seguridad: revisión completa, límites de intentos en BD (sirve en serverless), cabeceras (CSP…), páginas de
      error, npm audit, SEGURIDAD.md.
- [x] 9. Calidad: Vitest (compatibilidad, precios/envíos) + Playwright (recorrido completo), 404/500, estados de carga,
      SEO (sitemap, robots, imagen para redes), móvil y accesibilidad.
- [x] 10. README, CLAUDE.md, INFORME.md, graphify, commit final y `npm run dev`.

Notas técnicas de la fase de lanzamiento:

- Pedidos (`src/lib/pedidos.ts`): stock RESERVADO al crear (PENDIENTE), `marcarPedidoPagado` idempotente con
  `updateMany` condicionado, `liberarPedidosCaducados` (60 min, se llama al preparar cada pedido),
  `PEDIDO_COBRADO` (filtro de pagados no cancelados). Enlace privado `tokenAccesoPedido` = HMAC(AUTH_SECRET).
  Estados y transiciones del panel en `src/config/estadosPedido.ts`; cambios en lote: casillas de `/admin/pedidos` (Preparando/Entregado) y `/admin/pedidos/por-enviar` (seguimientos → Enviado + correo). Correos en `src/lib/avisosPedido.ts` (al pagar también avisa a la tienda: `AVISO_PEDIDOS_EMAIL` o, si está vacío, los ADMIN).
- Pagos: `src/lib/pagos/index.ts` (`modoPago()`: stripe | simulado | desactivado; en producción con claves `sk_test_` → desactivado salvo `STRIPE_PERMITIR_CLAVES_PRUEBA=si`, decisión de Jesse 21-10-2026), `stripe.ts`, webhook
  `src/app/api/pagos/stripe/route.ts` (tabla `EventoStripe`). Checkout: `prepararPedido` → `PagoStripe` o
  `confirmarPagoSimulado`. El formulario del checkout usa onSubmit + startTransition (no `action`, que reinicia el form).
- Cursos: `VideoVisto`, `ResultadoTest`, `finDelVideo.ts` (APIs de YouTube/Vimeo), `TestLeccion`, `corregirTest`.
- Portada: `src/components/portada/` (three solo vía import() en escenaRobot.ts).
- Consentimiento: `src/store/consentimiento.ts` + `BannerCookies` (en Proveedores) + `ReproductorVideo`.
- Límite de intentos en BD (`LimiteIntento`, `registrarIntento` es ASYNC). Cabeceras/CSP en `next.config.ts`.
- Base de datos: ver «Tecnología y versiones» (MongoDB). `src/lib/busqueda.ts` (`textoContiene`, mode insensitive).
- Pruebas: `npm test` (Vitest, `*.test.ts` en src) y `npm run test:e2e` (Playwright, `e2e/`, BD = la de `DATABASE_URL` + `_e2e`
  (`valentia_e2e`), que `scripts/e2e-preparar.mjs` borra y recrea;
  puerto 3100, Chrome del sistema). Tras muchas pruebas de login con `prueba@valentia.test` en dev salta el límite
  de 5 códigos/hora: borrar sus filas de `EnvioCodigo` (y `LimiteIntento` si hace falta).
- Tarjetas para láser: `/admin/codigos/lotes/[id]/laser` (route handler) da un .zip con dos SVG por código (`_delantero` y `_trasero`), solo grabado (tarjeta ya cortada, sin línea roja), del tamaño exacto de la tarjeta, con escuadras en las esquinas para centrar; todo fundido sin solapes con clipper-lib (`fusion.ts`)
  (`src/lib/tarjetaLaser/`: negro = grabar, cartulina negra; QR con los módulos claros grabados).
  Texto como formas desde `glifos.json` (regenerar con `scripts/generar-glifos-tarjeta.mjs`); ZIP propio con zlib.
  Si el QR sale en versión 7+ (dominio largo), se omite la "V" central para no tapar el patrón de alineación.
  Trasera: pasos + dibujo del kit según su slug (`dibujosKit.ts`; aprobados por Jesse el coche, el brazo y la
  estación). Un kit sin dibujo propio lleva pistas de circuito: al crear un kit nuevo, añadirle su dibujo.
- Panel: `Caja` lleva `min-w-0` y `Tabla` es `relative` + enfocable (evitan desbordes en el móvil).

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

- **Panel de administración** (`/admin`, 7 partes desde `0a4aaa1`; el uso está explicado en el README):
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
  - Parte 5: vídeos en `src/lib/video/` (un archivo por servicio en `proveedores/`; `normalizarVideo`, `analizarVideo`,
    `fuenteVideo`). `/admin/cursos` (progreso medio en `src/lib/admin/cursos.ts`), lecciones con ↑↓, tests y retos.
  - Parte 6: `CodigoActivacion.desactivadoEn` + modelo `LoteCodigos` (migración `lotes_de_codigos`). `/admin/codigos`
    (generar lote de 1–500, filtros por estado/kit/lote, buscar por código o email, desactivar/reactivar) y
    `/admin/codigos/lotes/[id]` (tarjetas `TarjetaActivacion` para imprimir, 4 por A4). `activarCodigo` y `/activar`
    rechazan los desactivados; quien ya lo activó conserva el curso. Partes 5 y 6 probadas en Chrome headless.
  - Parte 7: revisión en móvil 390 px y escritorio de 19 páginas (panel + tienda): sin desborde ni errores de consola.
    Cerrar sesión también en el menú móvil del panel. README («Panel de administración») y este archivo.
  - Notas técnicas: piezas del panel `BotonAdmin`, `Caja`, `Tabla`, `campos.tsx`, `BotonConfirmar` (confirmación antes de
    borrar), `ListaEditable`, `BotonesMover`. Cada página llama a `exigirAdmin(ruta)` y cada acción a
    `exigirAdminEnAccion()`. Slugs fijos tras crear. Para probar: ascender `prueba@valentia.test` con `npm run admin` y
    quitarle el rol al acabar (el usuario quiere ser el ÚNICO administrador). Los ADMIN también necesitan código en
    cada navegador nuevo (confianza de 7 días).

- **Verificación por email** (7 partes desde `3f5c98d`; uso y pruebas en el README «Verificación por email»):
  - Correo: `src/lib/correo` (`enviarCorreo()`; `consola.ts` con `npm run dev` SIEMPRE, guarda en `.correos-dev/`
    fuera de git; `resend.ts` con fetch, sin paquete; `CORREO_PROVEEDOR`, `RESEND_API_KEY`, `CORREO_REMITENTE`).
    Plantillas en `plantillas.ts` (HTML con tablas y estilos en línea; escapan los datos del usuario). `/dev/correos`
    (404 si NODE_ENV ≠ development).
  - BD (migración `verificacion_por_email`, marca verificadas las cuentas que ya existían): `Usuario.emailVerificadoEn`,
    `Verificacion` (tokenHash de la cookie `valentia_verificacion`, codigoHash = HMAC con AUTH_SECRET de
    motivo:email:código, intentos, caducaEn, enviadoEn, confirmadoEn, usadoEn; `usuarioId` null = señuelo),
    `EnvioCodigo` (límite por hora por email), `DispositivoConfianza` (tokenHash de la cookie `valentia_dispositivo`,
    nombre legible, caducaEn, `paseHash` de un solo uso). Reglas en `src/lib/verificacion/reglas.ts`.
  - Flujo: las acciones `iniciarSesion`/`registrarse` (`src/app/(auth)/acciones.ts`) comprueban la contraseña;
    sin verificar → código REGISTRO; navegador sin confianza → código DISPOSITIVO; con confianza → `abrirSesion()`
    (`entrar.ts`: pase de 60 s → `signIn("credentials", { pase })` en el servidor). Auth.js SOLO acepta pases.
    El `jwt` de `src/auth.ts` llama a `comprobarSesion` en cada lectura: si el dispositivo ya no vale devuelve null
    (sesión cerrada) y refresca el rol. Registro con email existente y recuperar con email sin cuenta → señuelo.
    Si se repite el envío antes de 60 s se reutiliza el mismo código (no sale otro correo).
  - Pantallas: `/verificar` (`CasillasCodigo`: pegar, autocomplete one-time-code, envío automático), `/recuperar` →
    `/verificar` → `/recuperar/nueva` (cierra todas las sesiones y deja dentro a este navegador), `/cuenta` (Mis
    dispositivos, cerrar sesión en todos, cambiar contraseña: conserva este dispositivo). `TarjetaCuenta`, `Aviso`,
    variante `peligro` de `Boton`, token `--color-error-oscuro` (texto de error sobre fondo rojo claro).
  - `npm run admin` acorta a 7 días los dispositivos del nuevo ADMIN. Probado en Chrome headless (escritorio y móvil,
    también con `npm start`) y axe-core: 0 problemas en las pantallas nuevas (salvo `/dev/correos`, solo desarrollo).

### Pendiente (para cuando se publique la web: lista completa en INFORME.md §3, tareas del usuario)

- Datos de empresa en `src/config/tienda.ts` y revisión legal de `/legal/*` (BORRADORES).
- Render + Atlas `valentia-prod` (`DESPLIEGUE.md`), Stripe (claves reales + webhook), Resend, fotos en la nube (R2),
  `AUTH_SECRET` y `NEXT_PUBLIC_SITE_URL` de producción. Copias de seguridad a mano (`npm run db:copia`).
- Sin probar contra servicios reales: Stripe (solo pago de prueba), almacén S3/R2, Render y Resend (MongoDB Atlas sí).
- Posibles mejoras (preguntar antes): facturas en PDF, envío a más zonas, analítica con consentimiento.

### Avisos abiertos

- `/configurador`, `/checkout`, `/pedido/[id]`, `/activar`, `/login`, `/registro`, `/cuenta/*` y `/cursos/*` son dinámicas: `npm start` necesita la BD.
- La BD es la fuente de verdad: `npm run db:seed` solo carga `data/*.json` si no hay catálogo. `npm run db:reset` lo
  borra TODO (también la cuenta del administrador: luego registrarse y `npm run admin -- email`).
  `db:seed` (usuario y códigos de prueba) se niega con NODE_ENV=production, `RENDER` o BD «prod»; en producción `db:catalogo`.
- `.env` del usuario apunta a un clúster de DESARROLLO en Atlas (BD `valentia`). No mostrar nunca `DATABASE_URL`: al
  ejecutar Prisma filtrar las líneas con `mongodb.net`. `prisma/dev.db` (SQLite antiguo) sigue en disco, sin usar.
- Tras cambiar `prisma/schema.prisma`: `npm run db:push` (y reiniciar `npm run dev`). Campo opcional nuevo →
  añadirlo a `OPCIONALES` (`src/lib/nulos.ts`; el test lo exige). Ids de URL/formularios → `esId()`.
- Playwright con los formularios del panel que llevan `<input name="id">`: `form.id` deja de ser texto y los
  locators fallan con «text.replace is not a function»; en pruebas, usar `page.evaluate` + teclado.
- `subidas/` (fotos del panel) no está en git: hay que copiarla junto con la BD. En producción, almacén en la nube.
- Las pruebas con Chrome headless no conservan la sesión entre ejecuciones (se cierra de golpe): iniciar sesión en la misma ejecución.
- En desarrollo los correos no salen: se ven en la terminal y en `/dev/correos` (también confirmación y envío de pedidos).
- Para probar el login en Chrome headless: cada navegador nuevo pide código; leerlo del último JSON de
  `.correos-dev/`. Los límites (login 10/15 min por IP+email en la tabla `LimiteIntento`; 5 códigos/hora por email en
  `EnvioCodigo`) se agotan rápido en pruebas: vaciar esas filas (solo las del usuario de prueba).
- Tras `prisma generate` con tablas nuevas hay que reiniciar `npm run dev` (el cliente de la BD queda en memoria).
- `npm audit`: 8 avisos "altos": braces/micromatch vía eslint-config-next y deepmerge-ts vía la CLI de Prisma 6 (solo
  desarrollo); el arreglo bajaría a Next 14 o cambiaría Prisma. Esperar.
- `graphify-out/` (salida de la herramienta graphify del usuario) no está en git ni en .gitignore: solo la actualiza graphify (regla 11); no tocarla a mano.
- npm avisa de "install scripts not yet covered by allowScripts" (prisma, @prisma/engines,
  esbuild, unrs-resolver). Por ahora solo es un aviso y los scripts se ejecutan; no se ha cambiado ninguna configuración.
- Vídeos de los cursos: `PENDIENTE` en la BD, a la espera de las URL reales (se ponen desde `/admin/cursos`).
- Portada: robot 3D (hero), «De la caja a tu primer robot», kit estrella y una sección para cada uno de los otros kits.
- Identidad de git configurada solo en este repositorio: `Diego <diegonotsa@gmail.com>`.

### Decisiones aprobadas por el usuario

- Color de acento "Azul circuito" **#2D4BFF** (#7A8CFF sobre fondos oscuros).
- **Auth.js v5 beta** (`next-auth@beta`).
- Logo redibujado en **SVG** y monograma **"V"** para el favicon y los iconos (sin tocar `imagenes/logo.png`).
- Iconos con **lucide-react**.
- **Euros con IVA incluido** y español de España (**es-ES**).
- El cliente puede **montarse su propio kit** en el configurador (previsto desde el principio). Un robot personalizado,
  aunque parta de un kit, **no incluye curso ni código QR**: solo los kits cerrados.
- **Panel de administración**: un solo administrador, el usuario (`diegonotsa@gmail.com`). Códigos: conviven los lotes
  impresos y los que se crean al pagar. Desactivar un código usado no quita el curso. Borrar algo con dependencias se
  bloquea y se ofrece ocultar. El seed solo carga datos si la BD está vacía. `sharp` pasa a dependencia normal.
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
10. **Antes de hacer cualquier cambio, actualizar desde GitHub**: `git fetch origin` y traer lo nuevo de `main`
    (`git merge --ff-only origin/main`; en una rama de trabajo, unir `origin/main`). Hay más gente subiendo cambios.
    Si hay cambios sin guardar o conflictos, no descartar nada: avisar al usuario antes de seguir. Si llegan cambios en
    `package.json` o `prisma/schema.prisma`, hacer `npm install` o `npm run db:push` y reiniciar `npm run dev`.
11. **Después de cada cambio, actualizar el grafo**: `graphify update .` (solo código, sin IA). Si el cambio toca
    documentos (`.md`) o imágenes, usar `/graphify . --update`.

## Marca y sistema de diseño

- Logo original: `imagenes/logo.png` (negro #0B0B0B sobre blanco, sin transparencia, trazos muy finos).
- Versiones web en `public/images/brand/`: `logo.svg` (redibujo vectorial, negro), `logo-blanco.svg`,
  `logo.png` (copia), `logo-negro.png` / `logo-blanco.png` (recortados, transparentes), `monograma.svg` ("V" para iconos).
  `monograma.svg` es la fuente del favicon (elegido por Jesse el 23-10-2026), `icon.png` (192, múltiplo de 48 como
  pide Google), `apple-icon.png` y los iconos del manifest.
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

- Stripe (`stripe` + `@stripe/stripe-js/pure`), three.js (portada), aws4fetch (fotos S3), Vitest + Playwright (pruebas).
- Next.js 16.4.1 (App Router, Turbopack) · React 19.3.1 · TypeScript 6.0 (typescript-eslint aún no admite la 7)
- Tailwind CSS 4.3 · Zustand 5 (carrito en localStorage) · lucide-react (iconos)
- ESLint 9 (eslint-config-next aún no admite ESLint 10) + Prettier 3 (con plugin de Tailwind)
- **MongoDB Atlas** con **Prisma 6.19.3** (Prisma 7/8 NO admiten MongoDB: no actualizar sin preguntar).
  - `prisma.config.ts` (carga .env con dotenv; con este archivo Prisma no lo hace solo); `url = env("DATABASE_URL")` en el
    esquema. Generador `prisma-client` → `src/generated/prisma` (imports `@/generated/prisma/client|enums`; ignorado en git).
  - Sin migraciones: `npm run db:push` (también en el Build Command de Render). Ids `ObjectId`; claves compuestas como
    id + `@@unique`; sin únicos opcionales (MongoDB no admite varios null).
  - Cliente único en `src/lib/db.ts` (server-only) con `extensionNulos` (`src/lib/nulos.ts`): rellena con null los opcionales
    al crear (create/createMany/upsert, NO anidados). `transaccion()` reintenta conflictos (P2034). Scripts:
    `crearClienteScripts()` de `prisma/catalogo.ts`.
  - Copias: `npm run db:copia` / `db:restaurar` (paquete `mongodb`, EJSON) → `copias/` (fuera de git).
  - Catálogo (`prisma/catalogo.ts`, con tsx) valida `data/*.json` con Zod (`src/lib/validaciones/catalogo.ts`, mensajes en español). En los JSON los precios van en euros; en la BD, en céntimos.
- Zod 4 · qrcode (QR en SVG con corrección "H" y monograma en el centro) · Auth.js v5 beta (next-auth@5.0.0-beta.32) con email y contraseña cifrada (bcryptjs).
- Las páginas de kits se generan estáticas en el build leyendo la BD: `npm run build` necesita la BD (Atlas accesible desde esa IP).
- Animación al hacer scroll: clase CSS `aparecer` (scroll-driven animations, sin JS; respeta prefers-reduced-motion).
- En Windows, al parar `next dev` lanzado en segundo plano, comprobar que el puerto 3000 queda libre (el proceso hijo puede sobrevivir).
- Next 16: el antiguo `middleware.ts` se llama `proxy.ts`.
- Alias de importación: `@/` = `src/`.

## Estructura

```
imagenes/              originales del usuario (no tocar)
public/images/         brand/, componentes/, kits/
scripts/               generar-marca.mjs, hacer-admin.ts (npm run admin)
subidas/               fotos subidas desde el panel (fuera de git)
src/app/               (tienda)/, (auth)/ (login, registro, verificar, recuperar), (cuenta)/ (cursos, cuenta), activar/, api/, diseno/, admin/, subidas/ (sirve las fotos), dev/correos (solo desarrollo)
src/components/        ui/, layout/, marca/, tienda/, configurador/, compra/, cuenta/, cursos/, admin/
src/config/            marca.ts, categorias.ts, tienda.ts (negocio), estadosPedido.ts
src/lib/               db.ts, catalogo.ts, pedidos.ts, codigos.ts, qr.ts, fichaTecnica.ts, utils.ts, validaciones/, compatibilidad/, pagos/, sesion.ts, cursos.ts, activacion.ts, video/, limite.ts, admin/, almacenamiento/, correo/, verificacion/ (+ src/auth.ts, src/auth.config.ts, src/proxy.ts)
src/generated/prisma/  cliente de Prisma generado (no editar, no se sube a git)
data/                  componentes.json, kits.json, cursos.json (solo datos iniciales; la BD manda)
prisma/                schema.prisma (MongoDB), catalogo.ts, seed.ts (solo desarrollo)
src/store/             carrito.ts, configurador.ts, consentimiento.ts
e2e/                   pruebas Playwright (npm run test:e2e) · *.test.ts en src = Vitest (npm test)
copias/                copias de seguridad de la BD (npm run db:copia; fuera de git)
SEGURIDAD.md, INFORME.md  revisión de seguridad e informe de la fase de lanzamiento
DESPLIEGUE.md          publicar en Render + MongoDB Atlas
src/types/
```
