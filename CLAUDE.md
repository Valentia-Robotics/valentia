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

### Fotos realistas y «Ver en 3D» en el configurador (12-11-2026, rama `feature/visor-3d`; con Visualizalo)

Cada pieza de `/configurador` tiene foto realista (`public/images/componentes/<slug>.webp`, render del mismo modelo 3D,
fondo transparente sobre `niebla`) y, si su slug está en `PIEZAS_CON_3D` (`src/config/visor3d.ts` + test), un chip
«3D» arriba a la derecha de la foto (`Ver3dPieza`, en `TarjetaPieza` y `DetallePieza`) que abre el visor de
Visualizalo en un `<iframe>` (`Dialogo posicion="grande"`: pantalla completa en móvil). El visor vive en
`NEXT_PUBLIC_VISOR_3D_URL` (por defecto `https://www.visualizalo.es`, `/demo/vr-<slug>?ficha=1`) y su origen va en el
`frame-src` de la CSP (`next.config.ts`): sin él la ventana se queda en blanco. El MG996R va solo con foto, sin 3D.
**En producción las fotos hay que subirlas en `/admin/componentes`**: `seed:prod` no modifica filas existentes.

### Foto de perfil en grande (11-11-2026, rama `claude/project-thread-51a75i`; petición de Jesse)

En Mensajes, pulsar la foto de alguien (lista de chats, cabecera del chat, General) la abre en grande:
`FotoAmpliable` (dentro de `Avatar`). Cierra con X, tocando fuera o Esc. En la lista abre la foto, no el chat (span
`role="button"` + ventana en `<body>` con `createPortal`). Sin foto (o si no carga), no hace nada. Fotos nuevas a 512 px
(`LADO_FOTO_PERFIL`; antes 192, esas se ven algo borrosas en grande hasta que se vuelvan a subir).

### Admin que también es de hardware (11-11-2026, rama `claude/project-thread-ujau3u`; petición de Jesse)

Como «también editor»: `Usuario.tambienHardware` (solo ADMIN o SIGMA, en `OPCIONALES`). Se da en `/admin/usuarios`
(«Hacer también hardware» → `cambiarTambienHardware`; quitarlo no borra archivos). `tieneEspacioHardware(usuario)` y
`FILTRO_HARDWARE` en `src/config/equipo.ts` (+ test): `exigirHardware`, subir y crear carpetas, la lista de
`/admin/hardware` y los menús. Ese admin entra en `/hardware` con su menú del panel (sale «Mi espacio» tras «Hardware»);
sin `dueno`/`duenoId`, la API y las acciones usan el espacio de quien llama. Va en la sesión (`tambienHardware`).

### GIFs en el chat (11-11-2026, rama `claude/project-thread-mu0to6`; petición de Jesse)

Botón **GIF** (`SelectorGifs`, junto a los emojis): GIFs del momento + buscador; al tocar uno se envía solo. Buscan en
GIPHY desde el servidor (`GET /api/mensajes/gifs`, clave `GIPHY_API_KEY`; sin ella 503 `sinClave`). Tenor no: Google
cerró su API en 2026. Reglas puras en `src/config/gifs.ts` (+ test), servidor en `src/lib/mensajes/gifs.ts` (caché
10 min, límite `gifBusqueda`). Al enviar, `POST /api/mensajes/enviar` con `gif=<id>`: el servidor lo descarga (solo
`*.giphy.com`, 15 MB) y lo guarda como imagen del chat (WebP animado, almacén privado): mismos tics, avisos y
permisos. CSP `img-src` con `https://*.giphy.com` (vistas previas). `GIPHY_API_URL` solo para pruebas (GIPHY falso).

### Cabeceras verdes de placa de ordenador (11-11-2026, rama `diseno/placa-verde`; petición del usuario)

El campo azul de las cabeceras pasa a **placa de circuito verde oscuro** (`.campo-placa`, tokens `placa`, `placa-claro`
y `cobre`; `cielo` ya no existe) en portada, `CabeceraPagina`, `TarjetaCuenta`, `/activar` y la foto de las fichas
(`bg-placa`). **El texto encima va en BLANCO** (`text-white`, `Etiqueta oscura`, botón `punteado-claro`); la regla del
borde es cobre/blanco/amarillo y la sombra de las tarjetas del login, cobre. `CampoPixeles` (paleta `placa`): pistas de
cobre, chip negro «VR-01 ESP32» con patas plateadas y contorno impreso «U1», pads, vías y engranajes dorados, resistencias
y condensadores con su nombre (R1, C1…; `pintarPiezas`, nunca encima de pistas, texto o robot), robot impreso en blanco y
«VALENTIA ROBOTICS · REV 2.6». La variante `final` (bloque negro) sigue en azul (paleta `oscuro`).

### Valor de las acciones (11-11-2026, rama `feature/valor-acciones`; petición del usuario)

`/admin/acciones` (ADMIN y SIGMA, en el menú tras «Finanzas»). **3.000 acciones; reparto FIJO** en `src/config/acciones.ts`
(Diego 50 %, Jesse 49 %, Alonso 1 %; para cambiarlo, cambiar `SOCIOS`) + test. Dos valores: **a mano** (modelo
`ValoracionEmpresa`: el último manda, los anteriores son historial; se pueden borrar) y **según los números** (beneficio
de siempre sin IVA de Finanzas + kits y componentes del almacén a precio de venta sin IVA; puede salir negativo).
Valor de una acción = valor de la empresa / 3.000; cada socio = sus acciones × ese valor.

### Fotos del panel que no se borran (11-11-2026, rama `claude/project-thread-n5frek`; petición de Jesse)

Las fotos de kits y componentes que se suben en `/admin/kits` y `/admin/componentes` iban al disco de Render
(`ALMACEN_PROVEEDOR` local) y se perdían en cada publicación. Ahora, sin bucket público (`nube`) ni disco propio
(`ALMACEN_LOCAL_CARPETA`), y con `ALMACEN_PRIVADO_BUCKET` o en Render, van al almacén PRIVADO en `publicas/<carpeta>/<azar>.webp`
(`src/lib/almacenamiento/publicoEnPrivado.ts` + test). La dirección NO cambia (`/subidas/…`): la ruta `/subidas/[...ruta]` mira
primero el disco y luego el almacén (solo nombres de `nombreAlAzar`, siempre dentro de `publicas/`). Sin almacén en Render,
subir una foto da error en vez de perderla. Las fotos que ya se perdieron hay que volver a subirlas. Es el único sitio que
guardaba en disco algo que debe durar (los correos de `.correos-dev/` son de desarrollo).

### Fotos de perfil que todos ven (11-11-2026, rama `claude/project-thread-n22cf7`; petición de Jesse)

Las fotos de perfil iban al disco de Render (se vaciaba en cada publicación; quien la subió la seguía viendo por la caché
del navegador). Primer arreglo (PR #95): almacén privado R2. Segundo (Jesse seguía sin verlas): **se guardan en la propia
BD**, modelo `FotoPerfil` (WebP 192 px, calidad 80, ~2-10 KB; cascada al borrar la cuenta), `Usuario.foto` =
`/api/fotos-perfil/<id>`. La ruta (cualquiera con sesión, caché privada de un año: cada foto nueva tiene otra
dirección) también sirve las de R2 (`<azar>.webp`, `leerRutaFoto`). Lógica en `src/lib/almacenamiento/fotoPerfil.ts`
(+ test). `FotoPerfil` es de cliente: si no carga, iniciales; en «Mi cuenta» avisa «Tu foto se ha perdido».
El pre-despliegue (paso 4, `scripts/fotos-perdidas.ts`, no bloquea) pone a null las `/subidas/perfiles/…` en Render.
En el General sale la foto de quien escribe junto a sus mensajes.

### Avisos al momento y tics de leído en el chat del equipo (11-11-2026, rama `claude/project-thread-5axrg6`; petición de Jesse)

- **Web Push** (paquete `web-push`): `public/sw.js` (service worker sin caché: enseña el aviso, pone el número del icono y
  avisa a las pestañas abiertas con `postMessage` → miran ya). Modelo `SuscripcionPush` (uno por aparato; 404/410 → se
  borra) y `AjustesPush` (fila «push»: claves VAPID creadas solas; las variables `VAPID_CLAVE_*` mandan si existen).
  Envío en `src/lib/push/push.ts`, textos en `src/config/push.ts` (+ test), navegador en `src/lib/push/cliente.ts`,
  API `/api/push` (GET clave, POST, DELETE) y `/api/push/prueba`. Al enviar (`enviarYAvisar`, con `after`): privado → la
  otra persona; General → todo el equipo menos el autor.
- Página `/mensajes/avisos` (`PanelAvisos`): activar, probar, desactivar y guía Android/iPhone/ordenador. En iPhone
  solo funciona instalada: manifest propio `/equipo.webmanifest` (start_url `/mensajes`) en el layout de `/mensajes`.
- `AvisosEquipo` (en `MenuAdmin`): contador cada 5 s (`SEGUNDOS_REFRESCO_CONTADOR`), `ultimo` sin leer → «tilín» +
  tarjeta «Nuevo mensaje de…», título «(3) …» que parpadea con la pestaña escondida, número en el icono
  (`setAppBadge`) y cartel para activar los avisos (se esconde 3 días).
- Recordatorios a su hora sin nadie conectado: `src/instrumentation.ts` → `relojRecordatorios` llama cada minuto a
  `POST /api/mensajes/recordatorios` con `claveInterna` (HMAC de `AUTH_SECRET`). En `next dev`, solo con
  `RECORDATORIOS_EN_DESARROLLO=si`.
- **Tics** (`Chat`): reloj = enviándose · un tic gris = no salió (se queda con «Reintentar»/«Quitar») · dos grises =
  enviado · dos azules = leído (General: por todos; al tocarlos, quién sí y quién no). Sale de `LecturaCanal`
  (`lecturas` en `abrirChat`). La huella solo cuenta cuántos de MIS mensajes ha leído cada uno (`leidosDeLosMios`):
  si contara cada lectura, dos chats abiertos se recargarían el uno al otro sin parar.
- Probado con MongoDB en Docker, 3 personas, un servicio de push falso que descifra los avisos y el service worker con
  `ServiceWorker.deliverPushMessage` (en la nube no se puede suscribir de verdad: Google está bloqueado).

### Chat del equipo: emojis, imágenes y entrega casi al momento (11-11-2026, rama `claude/project-thread-49bp2y`; petición de Jesse)

- Jesse cambia su decisión del 09-11: en los chats se pueden mandar **SOLO imágenes** (JPG, PNG, WebP, GIF; 15 MB antes de
  reducir). Otros archivos, siguen en `/hardware`. `POST /api/mensajes/enviar` (multipart: chat, texto, imagen, tarea) →
  `enviarYAvisar` (`src/lib/mensajes/enviar.ts`, mismo camino que la acción de solo texto) → `guardarImagenMensaje`
  (`imagenes.ts`: sharp comprueba el contenido, 1600 px, WebP, sin EXIF; GIF animado sigue animado) en el almacén PRIVADO
  (`mensajes/<azar>.webp`). Campos `MensajeEquipo.imagenClave/imagenAncho/imagenAlto`. Se ve por
  `GET /api/mensajes/imagen/<id del mensaje>` (mismas reglas que leer el chat: un privado, solo sus dos personas; 404 a los
  demás). Borrar el mensaje borra la imagen. Límite `imagenEquipo` 60/hora. Elegir, pegar (Ctrl+V) o arrastrar.
- Emojis (Jesse pidió más el 11-11): `SelectorEmojis` con TODOS (~1.870, `CATEGORIAS_EMOJI` en `config/emojis.ts`, generado
  de emojibase-data 16 con palabras en español; hasta Unicode 15) en 9 categorías + Recientes (localStorage) y buscador
  (`buscarEmojis` en `config/mensajes.ts`, sin tildes). La lista se descarga solo al abrir el selector (`import()`).
  Todo en UNA lista con títulos (como WhatsApp); las pestañas son iconos de lucide, NO emojis (Jesse: si no, parece que solo hay esos).
- Entrega: el chat abierto pide `GET /api/mensajes/huella?chat=` cada 3 s (count + último + tareas + no leídos, en un hash)
  y solo hace `router.refresh()` si cambia (antes: la página entera cada 10 s). Botón «Mensajes nuevos» si estás leyendo
  arriba; hueco de la imagen reservado (no salta el scroll). Probado con MongoDB local (Docker) y 3 roles + un cliente.

### Nombre y foto de perfil (10-11-2026, rama `claude/project-thread-1gb5rz`; petición de Jesse)

«Mi cuenta» → «Tu perfil»: cambiar el nombre (`cambiarNombre`) y poner o quitar la foto (`cambiarFoto`: se sube sola al
elegirla, `subirImagen(…, "perfiles", { cuadrada: 256 })`, límite `fotoPerfil` 20/hora; la anterior se borra del almacén).
Campo nuevo `Usuario.foto` (opcional, en `OPCIONALES`). `comprobarSesion` devuelve rol, nombre y foto: el `jwt` pone
`token.name` y `token.picture` (→ `session.user.image`), así el menú los ve sin volver a entrar. La foto sale en
`MenuUsuario`, el menú móvil y los chats de `/mensajes` (`Avatar` con `foto`). Hacer ADMIN a alguien sigue siendo
`npm run admin -- email` (en Render: Shell), no desde el panel.

### Leyes de Gestalt en la tienda (11-11-2026, rama `diseno/gestalt`; petición del usuario)

- Semejanza: kits, componentes y piezas del configurador comparten aspecto (`TARJETA_TIENDA` en
  `components/ui/tarjeta.ts`). Tarjeta nueva de la tienda → usarlo.
- Región común: precio + acción en un pie con línea de puntos (`PIE_TARJETA`).
- Proximidad: en la ficha del kit, el precio va junto a los botones de compra, no encima de los puntos fuertes.
- Continuidad: en «Cómo funciona» la línea de puntos de los 3 pasos es una sola en pantallas anchas.

### Rol «Sigma» (11-11-2026, rama `feature/rol-sigma`; petición del usuario)

Para un compañero con los mismos accesos que un admin, pero por debajo. Enum `Rol.SIGMA` (en `ROLES_EQUIPO`,
`DIAS_CONFIANZA` 7). `tieneAccesoAdmin(rol)` (ADMIN o SIGMA) en `src/config/equipo.ts` es la comprobación del panel:
`exigirAdmin`, `exigirAdminEnAccion`, descargas (CSV, láser, bienvenida), stock, hardware, borrar en el General, menús.
`esJefe(rol)` = solo ADMIN. Lo único que no puede un SIGMA: dar o quitar SIGMA (lo hace un ADMIN en `/admin/usuarios`:
«Hacer sigma» en un cliente, «Quitar sigma» → cliente) y tocar cuentas de administración (ADMIN u otro SIGMA) salvo
la suya (`puedeTocar` en `admin/usuarios/acciones.ts`). Puede ser «también editor». Los correos de pedidos nuevos
siguen yendo solo a los ADMIN. **Rol nuevo con acceso al panel → usar `tieneAccesoAdmin`, nunca `rol === "ADMIN"`.**

### «Mis guiones», admin que también edita y «Editora» (10-11-2026, rama `feature/mis-guiones`; petición del usuario)

- `/editor` es el espacio de trabajo: lo asignado + **ideas propias** (origen `EDITOR`, `creadoPorId` = autor,
  `editorId` null). Pestañas (Activos · Por hacer · Mis ideas · Terminados · Archivados), buscador, cifras y aviso de
  fechas (`urgenciaGuion`). Idea: borrador privado (`PRIVADO` en `guiones.ts`: administración no ve ni toca las ideas en
  BORRADOR/DESCARTADO) → «Enviar a revisión» → el admin la aprueba y la asigna (sale elegido su autor) o la «Devuelve a
  su autor». Actor `AUTOR` en `TRANSICIONES`. Nunca se borra: «Archivar» = DESCARTADO.
- Ficha: teleprompter, copiar, descargar .txt e imprimir (`HerramientasGuion`), tiempo de lectura (150 palabras/min),
  notas que se guardan solas (`ZonaTrabajo`), `PASOS_EDICION` (`Guion.pasosHechos`; no cambiar ids) y «Duplicar como idea nueva».
- `Usuario.tambienEditor` (solo ADMIN): `puedeEditarGuiones` / `FILTRO_EDITORES` en `src/config/equipo.ts`; tiene «Mis
  guiones» en su menú de admin y se le asignan guiones. `Usuario.rolFemenino`: `nombreRol` («Editora», «Administradora»).
  Las dos se cambian en `/admin/usuarios` y van en la sesión (menús). Formulario de guion compartido: `leerFormularioGuion`.

### Cabeceras con placa de circuito (10-11-2026, rama `diseno/estela-tecnologica`; petición del usuario)

El usuario no quería la «mancha azul» ni el corte seco al final de los campos azules. `CampoPixeles` ahora dibuja una
placa: chip con patas, pistas a 90°/45° que acaban en pads o LEDs, señales que corren por ellas, robot de píxeles
(`ROBOT`) y engranajes; rejilla de puntos que se apaga lejos del chip. Posiciones en `chipsDe` (móvil: abajo); las
pistas se cortan en la zona del texto (`zonaTexto`) y antes del robot y los engranajes (`obstaculos`). La estela del
ratón es una pista que se apaga. Fondo `.campo-cielo` (azul → blanco abajo) en portada, `CabeceraPagina`,
`TarjetaCuenta` y `/activar`; máscaras `.mascara-abajo` / `.mascara-arriba` (final) en `globals.css`.

### Web más sencilla (10-11-2026, rama `diseno/estela-tecnologica`; el usuario aprobó las 8 propuestas)

- Portada: héroe → aviso → **kits** (destacado + `GaleriaKits` con los DEMÁS: no se repite) → cómo funciona → piezas por
  dentro → configurador → curso QR → final. Fuera la cinta de piezas (`Marquesina` y su CSS `.cinta`).
- Menú: Inicio · Kits · «Crea tu robot» (`/configurador`, también marca `/componentes`) · «Mis cursos» solo con sesión
  (`soloConSesion` en `enlacesNavegacion`). Componentes sigue en el pie.
- Sin etiquetas «de máquina» encima de las fotos (`fig. —`, `↳ /kits/…`).
- Configurador vacío: el panel «Tu robot» ya no repite los kits (están en «¿Cómo quieres empezar?»).
- 404: `components/layout/AvisoNoEncontrada`; `(tienda)/not-found.tsx` y `(cuenta)/not-found.tsx` sin `MarcoWeb` (el pie
  salía dos veces porque el not-found raíz se pintaba dentro del layout de la zona).

### Stock del almacén (10-11-2026, rama `claude/project-thread-bbn9v7`; petición de Jesse)

`/stock` (fuera de `/admin`, como `/mensajes`): lo ve todo `ROLES_EQUIPO`, solo un ADMIN lo cambia (botón «Cambiar» →
`guardarStock` con `exigirAdminEnAccion`). Reglas puras en `src/config/stock.ts` (+ test); BD en `src/lib/stock/stock.ts`.
- Campos nuevos: `Kit.stock` (kits montados en su caja, por defecto 0), `stockMinimo` (null = aviso de siempre: 3 kits,
  10 componentes) y `enReposicion` («Ya hemos pedido más»; se quita sola al pasar del aviso) en Kit y Componente.
  Modelo `MovimientoStock`: cada cambio a mano («Últimos cambios»). Kits gratis fuera.
- Estados: Reposición necesaria (0, sin pedir) · Stock bajo · Reposición en curso (pedido) · Stock suficiente.
- Decisión de Jesse: **cada kit vendido resta uno de su stock y con 0 no se vende** (`reservarStock` en `pedidos.ts`;
  cancelar lo devuelve). Tienda (`textoTienda`): «En stock» / «En reposición» (0 y pedido) / «Sin stock» (0 y nada
  pedido o ya no se vende). El seed de desarrollo pone 20 a los kits con 0 (para e2e).

### Finanzas: ingresos, gastos y beneficio (10-11-2026, rama `claude/project-thread-90iech`; petición de Jesse)

`/admin/finanzas` (solo ADMIN, en el menú tras «Pedidos»). Ingresos y gastos apuntados a mano (modelo `MovimientoDinero`:
tipo, concepto, categoría, importe con IVA, % de IVA, fecha, proveedor/cliente, notas) + los pedidos cobrados
(`PEDIDO_COBRADO` + `cobroReal: true`, por `pagadoEn`), que cuentan solos como ingreso «Ventas en la web» (no se guardan aparte).
  `Pedido.cobroReal` lo pone el webhook de Stripe solo con `livemode`; los pagos de prueba y simulados (y todos los anteriores
  al 10-11-2026) se quedan fuera.
- Reglas puras: `src/config/finanzas.ts` (categorías por slug, tipos de IVA, meses en hora de Madrid, periodos `12m`/año/`todo`)
  y `src/lib/finanzas/resumen.ts` (+ test). BD: `src/lib/admin/finanzas.ts`. Validación: `src/lib/validaciones/finanzas.ts`.
- Gráficos sin librerías (`GraficosFinanzas`): ingresos/gastos por mes (azul/naranja), beneficio por mes, dinero acumulado;
  reparto por categoría, IVA cobrado/pagado y beneficio sin IVA, tabla mes a mes, lista y CSV (`/admin/finanzas/csv`).
- Categoría nueva → añadirla a la lista (nunca cambiar un slug que ya se usa: los apuntes guardan el slug).

### Nombre del coche (08-11-2026, rama `claude/project-thread-4lji9k`)

Decisión de Jesse: el kit del coche se llama **«Kit de coche robótico multifunción VR1 - Starter Kit»** (con guion, no dos
puntos). En producción el nombre se cambia a mano en `/admin/kits` (seed:prod no modifica lo que existe). En textos
corridos: «coche robótico multifunción VR1».
Dirección nueva (Jesse, mismo día): slug **`vr1-starter-kit`** (antes `coche-seguidor-de-lineas`). Parejas viejo → nuevo en
`src/config/kitsRenombrados.ts`: `next.config.ts` redirige (308) la ficha, sus subrutas y las fotos viejas; carrito y
configurador del navegador se actualizan solos (versión nueva de su `persist`); `slugKitActual` en pedidos, configurador y
guiones de n8n. La BD la cambia el pre-despliegue de Render (`scripts/renombrar-kits.ts`, antes del catálogo; también
`npm run kits:renombrar` en local): slug, foto de siempre, `LineaPedido.slug` y `ListaEspera.kitSlug`.

### App del móvil y coche con ESP32 (08-11-2026, rama `claude/project-thread-r9yhy3`)

Decisión de Jesse: app para Google Play (luego App Store) que funcione como la web: el código del kit desbloquea sus
funciones (coche: control remoto por Bluetooth, en la 2.ª versión). Carpeta **`movil/`** (Expo SDK 58 + Expo Router,
`README.md` para probarla con Expo Go y publicarla con EAS). Paquetes siempre con `npx expo install` (aquí con
`EXPO_OFFLINE=1`: api.expo.dev está bloqueado en la nube).

- API en la web: `src/lib/app/api.ts` (Request/Response, también en `backend/app.ts`): `/api/app/entrar` (contraseña →
  código por email, sin cookie: `empezarVerificacion({ sinCookie })` devuelve el token de la verificación), `verificar`,
  `reenviar`, `yo` (kits = cursos que tiene + `funcionesDeKit`), `activar` (acepta la URL del QR), `salir`.
  Sesión: `src/lib/app/sesionApp.ts`, un `DispositivoConfianza` por móvil (token Bearer, solo su huella en la BD,
  90 días que se alargan al usarla; sale en «Mis dispositivos»). La cuenta se crea en la web.
- Qué desbloquea cada kit: `src/config/app.ts` (`disponible: false` = «Muy pronto» en la app).
- Coche: placa **ESP32** (no UNO) y sensor **HC-SR04P** (3,3–5 V), decisión de Jesse. Nuevo campo opcional
  `Componente.voltajeLogicoMin` («también acepta señales desde»): L298N, TCRT5000 y HC-SR04P = 3,3, así la regla
  `logica-5v-en-placa-3v3` no avisa con la ESP32. Modelo 3D del coche: ESP32 sobre su base de expansión.
  En producción hay que cambiarlo a mano en el panel (seed:prod no modifica lo que existe).
- Mando del coche (2.ª parte, petición de Jesse): `movil/src/app/mando.tsx` + `src/control/` (wifi = WebSocket a la
  ESP32 en modo punto de acceso `Valentia-Coche-XXXX`/`valentia`, `ws://192.168.4.1:81/`; Bluetooth = BLE Nordic UART con
  react-native-ble-plx, solo en development build). Protocolo de texto por líneas: app → `M izq der` (cada 150 ms),
  `P`, `O manual|linea|obstaculos`, `L` (latido); coche → `H nombre versión`, `D cm`, `O modo`. El coche para a los
  500 ms sin mensajes. Firmware en `firmware/coche-esp32/` (sin compilar aquí: descargas de Arduino bloqueadas).

### Portada estilo «taller» (09-11-2026, rama `diseno/portada-con-alma`; petición del usuario)

El usuario pidió una portada al estilo de fal.ai/pricing, «que no parezca una web hecha con IA», con alma y más fluida. Solo
la inspiración (nada de su marca): campo de color con píxeles vivos, titulares enormes y apretados (`.titular-cartel`),
entradillas en serif (Newsreader, `font-serif`), etiquetas técnicas en mono (JetBrains Mono, `font-mono`; las dos con
un solo grueso y sin precarga, por velocidad), líneas de puntos (`.linea-puntos`), esquinas casi rectas (`rounded-recto`),
tablas sobre `bg-salvia`. Tokens nuevos: `cielo`, `salvia`, `senal` (amarillo de las ruedas, nunca para texto).
- Orden: `HeroPortada` (h1, `CampoPixeles`: canvas con cable, mancha tramada y píxeles que parpadean y siguen al ratón; se
  para fuera de pantalla y con reducir movimiento) → `Marquesina` (piezas reales de la BD) → `PiezasPortada` (ver abajo; antes el 3D,
  ahora h2 «Así es un robot por dentro», texto por encima del lienzo) → aviso → `BloqueComoFunciona` → `KitsPortada` (destacado +
  `GaleriaKits`: tarjetas con foto, sin efectos de ratón; antes `TablaKits`) → configurador (cajones rectos) → curso QR → `BloqueFinal` (negro con píxeles).
- Botón: variantes `bloque` (negro recto, se levanta con sombra azul) y `punteado`. `Etiqueta` y `PalabrasQueSuben` en
  `components/portada/Etiqueta.tsx` (el espacio va fuera de cada palabra). Borrados `HeroKit` y `SeccionKit` (solo eran de la portada).
- Segunda tanda (mismo día, petición del usuario):
  - **Sin coche 3D en la portada** (al usuario el tramo se le hacía largo): `PiezasPortada`, mosaico de las 5 piezas
    con sus fotos de estudio y un «escáner» azul que pasa solo de una a otra (fila deslizable en el móvil). Borrados
    `PortadaRobot`, `RobotEstatico`, `escenaRobot` y `fusionarMallas`; `modeloCoche` sigue (fotos de `fotos:piezas`).
  - **Toda la web uniforme**: `ui/CabeceraPagina` (campo azul con `CampoPixeles variante="cabecera"`, etiqueta, titular de
    cartel, entradilla serif) en kits, componentes, guías, blog, preguntas, carrito, checkout, cuenta, cursos, pedidos y legales
    (va FUERA del Contenedor). Login/registro/activar: tarjeta con sombra azul sobre el campo azul. Fichas: foto sobre campo azul.
  - Pie: `PaisajePixeles` (noche: estrellas, luna, montañas, mar, tierra; medio transparente y fundido hacia arriba).
    Las banderas (`BanderasPixeles`) se quitaron el 10-11-2026 a petición del usuario.
  - **Ojo en local**: `npm run build` con `npm run dev` encendido deja la caché de desarrollo mal y la página se recarga
    sin parar. Parar el dev, construir y borrar `frontend/.next/dev` antes de volver a arrancar.
  - **Pie negro** en toda la web (texto claro) con el paisaje de píxeles (sin banderas desde el 10-11-2026).
  - **Estilo en toda la web** desde lo compartido: radios a 2-4 px (tokens), `Boton` (relleno que se levanta con sombra
    recta; secundario punteado), `ui/Etiqueta` en mono, `.etiqueta-taller` (antes «text-sm … text-acento uppercase»),
    h1/h2 apretados, tarjetas de kit y componente con sombra recta azul, barra de navegación con línea de puntos.
- Lighthouse móvil en local: portada 89 (antes 65, sobre todo por quitar el 3D). Accesibilidad, SEO y prácticas 100.

### Mensajes y tareas del equipo (09-11-2026, rama `claude/project-thread-0upidw`; petición de Jesse)

«Como un WhatsApp»: `/mensajes` para los roles de `ROLES_EQUIPO` (un cliente recibe 404). Chat «General» y un chat
privado entre cada dos personas del equipo, de cualquier rol (solo lo ven esas dos; tampoco los ADMIN). Rol nuevo en
`ROLES_EQUIPO` → le salen solos sus chats. Decisión de Jesse: **sin archivos en los chats** (siguen en `/hardware`).

- Reglas puras: `src/config/mensajes.ts` (+ test). Canal = `"general"` o `"privado:<id menor>_<id mayor>"`; dirección
  `/mensajes/general` o `/mensajes/<id de la otra persona>`. BD y permisos: `src/lib/mensajes/mensajes.ts`.
  Modelos `MensajeEquipo` y `LecturaCanal` (hasta dónde ha leído cada uno: los «no leídos»).
- Sin WebSocket: el chat abierto hace `router.refresh()` cada 10 s; `AvisosEquipo` (en `MenuAdmin`) pide
  `GET /api/mensajes/no-leidos` cada 45 s → número del menú (`store/avisosEquipo.ts`) y alarmas.
- Tareas (Jesse: «como Notion»): estado Por hacer / En curso / Hecha, prioridad Alta/Media/Baja (rojo/amarillo/verde),
  entrega, responsable y recordatorio. Tablero en `/mensajes/tareas`. La alarma suena en la web del responsable (o del
  autor si no hay) con pitido, tarjeta y aviso del navegador (posponer 10 min / 1 h, cerrar, hecha). El correo del
  recordatorio lo manda la misma petición del contador (`after`), sin tarea programada: sale cuando alguien del equipo
  tiene la web abierta.
- Correos (`plantillaMensajeEquipo`): privado → solo el primero sin leer y si no está conectado; tarea en el General →
  a su responsable. Límite `mensajeEquipo` 300/hora. Borrar: lo suyo cada uno; en el General, un ADMIN cualquiera.

### Guiones: descartar sin borrar y registro de n8n (09-11-2026, rama `mejoras/guiones-no-se-borran`)

El usuario echó en falta guiones de n8n del día anterior y pidió que no se borren. La web solo borraba al «Descartar».
- Estado `DESCARTADO` (fuera de `ORDEN_ESTADOS`: no es un paso del flujo). `descartarGuion(id, autor)` cambia el estado y lo
  apunta en el historial; `recuperarGuion` lo devuelve a pendiente (botón «Recuperar»). Ya NADA borra guiones.
  `buscarGuiones` esconde los descartados salvo con `?estado=DESCARTADO`; lista hasta 1000 (antes 300).
- Modelo `LlamadaGuion`: cada POST de n8n con su respuesta (201/409/400/401/413/429), título, noticia y motivo; 90 días.
  Panel `/admin/contenido/llamadas`. Clave mal: se apunta como mucho `guionApiFallos` por IP y hora.

### Rol Hardware y espacios de archivos (09-11-2026, rama `feature/rol-hardware`; petición del usuario)

Decisiones del usuario: archivos en **Cloudflare R2** (bucket PRIVADO `ALMACEN_PRIVADO_BUCKET`, mismas claves `ALMACEN_*`
que las fotos) y cada espacio lo ven **solo su dueño y los ADMIN**.

- Rol `HARDWARE` (enum, `ROLES_EQUIPO`, `DIAS_CONFIANZA`, `next-auth.d.ts`). Se da en `/admin/usuarios`
  (`cambiarRolTrabajo`: un cliente pasa a editor o hardware; con rol, solo vuelve a cliente). Quitarlo NO borra archivos.
- Zona `/hardware` (`exigirHardware`, `MenuAdmin zona="hardware"`), panel `/admin/hardware` y `/admin/hardware/[usuarioId]`.
  Mismo componente `components/hardware/EspacioArchivos` (+ `SubirArchivos`, cliente, XHR con progreso).
- Modelo `ArchivoHardware` (carpeta de texto, `clave` al azar en el almacén, `onDelete: Restrict`). Permisos en un solo
  sitio: `src/lib/hardware/archivos.ts` (`puedeUsarEspacio`). Reglas puras en `src/config/hardware.ts` (50 MB/archivo,
  2 GB/persona, nombres y carpetas limpios, Content-Disposition) + test.
- Almacén: `src/lib/almacenamiento/privado.ts` (R2 o carpeta `archivos-privados/` en local, fuera de git; en Render sin
  bucket no deja subir). Subida: `POST /api/hardware/archivos` (cuerpo = archivo, nombre en `x-nombre-archivo`; por `/api`
  para no pasar por el proxy; `mismoSitio`, límite `hardwareSubida`, `leerBytes`). Descarga: `GET /api/hardware/archivos/<id>`
  (siempre octet-stream + attachment + nosniff). Borrar: acción `borrarArchivoHardware`.
- Subir carpetas (Jesse, 09-11-2026): `SubirArchivos` tiene «Elegir archivos» (sueltos, 20) y «Elegir carpeta»
  (`webkitdirectory`, hasta 500) y acepta arrastrar archivos o carpetas. Cada archivo va a `carpetaDeRuta(base, ruta)`
  (sus subcarpetas se recrean); se saltan los del sistema (`esArchivoDelSistema`). Máximo 8 niveles; límite
  `hardwareSubida` 1000/hora.
- Carpetas vacías (Jesse, 11-11-2026): modelo `CarpetaHardware` (dueño + ruta, único) para que una carpeta salga aunque
  no tenga archivos (`verCarpeta(…, guardadas)`). Se crean con «Nueva carpeta» (`NuevaCarpeta`), al subir una carpeta
  (todas sus subcarpetas, también las vacías: «Elegir carpeta» usa `showDirectoryPicker` en Chrome/Edge; `webkitdirectory`, el de Firefox/Safari, se las salta) y al borrar el último archivo.
  «Borrar» en cada carpeta: `borrarCarpeta` borra todo lo de dentro (almacén y lista; la de arriba se queda). Se pueden
  elegir varias carpetas una detrás de otra (se suman). Subir un archivo igual (nombre, carpeta y tamaño) no lo repite
  (la API responde 200 con `repetido`): volver a subir una carpeta entera solo trae lo que faltaba.
- Rutas con `path.resolve` dinámico: llevar `/* turbopackIgnore: true */`; sin él, `next dev` vigila todo el proyecto y la
  página se recarga sin parar (pasó con `enDisco`).
- Guía para el usuario: DESPLIEGUE.md §6 quinquies.

### Equipo y última conexión (09-11-2026, rama `mejoras/blog-refresco-ultima-conexion`)

Petición del usuario: ver cuándo se conectó por última vez cada trabajador. Roles de trabajo en `src/config/equipo.ts`
(`ROLES_EQUIPO`: hoy ADMIN y EDITOR). **Rol nuevo (pronto «Hardware»): añadirlo al enum `Rol` y a `ROLES_EQUIPO`**, y sale solo.
`Usuario.ultimaConexionEn` se apunta en `comprobarSesion` (cada lectura de sesión), solo a esos roles y como mucho cada
2 minutos; a los clientes no. `/admin/empleados` (por rol, «Conectado ahora» si < 5 min). En `/admin/usuarios` los empleados salen primero (todos en la
página 1, con su última conexión) y debajo los clientes por páginas.
Si no hay conexión apuntada, se usa el último uso de sus dispositivos (`ultimaConexion` en `src/lib/admin/equipo.ts`).
Blog: `refrescarBlog` nombra cada página del listado (`revalidatePath("/blog", "layout")` no renovaba `/blog`).

### Blog automático y SEO (09-11-2026, rama `feature/blog-auto-seo`; especificación del usuario)

Decisiones del usuario (con las recomendaciones): imágenes SOLO de bancos con licencia libre (`HOSTS_IMAGENES`), nunca
la foto de la noticia; n8n llama cada hora a la cola (sin tarea dentro de Render ni otro servicio); publicación automática
APAGADA por defecto; GA4 preparado y apagado; `BLOG_API_KEY` separada de `N8N_API_KEY`.

- Reglas en `src/config/blog.ts` (5 categorías fijas por slug, calidad, largos de meta, estados y su nombre en la API).
  Modelos `Articulo` (contenidoMd + contenidoHtml), `SlugAntiguoArticulo` (301/308), `AjustesBlog` (fila «blog»), `LlamadaBlog`.
- `src/lib/blog/`: `texto.ts` (marked + sanitize-html: única forma de crear `contenidoHtml`; H1→H2, nofollow, imágenes de
  bancos libres), `calidad.ts`, `cola.ts` (hora de Madrid), `articulos.ts` (BD, publicar = refrescar + IndexNow
  `avisarPaginas` + webhook), `api.ts` (las 3 rutas de `/api/blog`, cada llamada en el registro).
- Páginas `/blog`, `/blog/pagina/N`, `/blog/categoria/X[/pagina/N]`, `/blog/[slug]` (ISR), `/blog/rss.xml`; sitemap.
  Panel `/admin/blog` (+ `/llamadas`) y `/editor/blog` (solo los suyos; vuelven a pendiente).
- `metadatosPagina` admite `tituloExacto`, `imagen` e `indexar`. `src/lib/claveApi.ts`: clave x-api-key para todas las APIs de n8n.
- Analítica: `src/config/analitica.ts` + `AnaliticaGoogle`; con ID, el consentimiento pasa a VERSION 2 (vuelve a preguntar).
- Lighthouse (móvil, antes): portada 69 por el robot 3D (TBT 2,5 s; ya se carga en diferido: no tocado sin permiso),
  ficha de kit 94, guías 99. SEO 92 → enlace del aviso de cookies arreglado.

### Fluidez, seguridad y n8n (06-11-2026, rama `mejoras/fluidez-seguridad-n8n`)

Decisión del usuario: **se queda en Render y con MongoDB**; la separación de abajo queda parada, no continuarla sin que la pida.

- Portada sin imán de scroll: daba sensación de bloques (decisión tomada para que fluya; antes `scroll-snap` y `centroDePieza`).
  Kits y configurador forman un solo tramo oscuro. `ui/Fundido` une secciones de distinto color: su `desde` tiene que ser el color
  exacto de la sección de arriba.
- `TransicionPagina` (`ViewTransition` con `key` por ruta, en `MarcoWeb` y paneles): cambio suave de página. `FotoKitViaje`: la
  foto del kit viaja de la tarjeta a la ficha; el nombre `kit-<slug>` solo puede salir una vez por página. `BarraCarga`: raya azul.
- `.aparecer`, `.acercar` (`animation-timeline: view()`) NO funcionan dentro de `overflow-hidden`: usar `overflow-x-clip`.
- Rutas públicas: leer el cuerpo con `leerCuerpo` (`src/lib/cuerpoLimitado.ts`), nunca `request.text()`/`json()`. Revisión en SEGURIDAD.md.

### Guiones automáticos de n8n (07-11-2026, misma rama; especificación del usuario)

- `POST /api/guiones/automaticos` y `GET …/ping` (sin sesión; cabecera `x-api-key` = `N8N_API_KEY`, tiempo constante; sin clave
  en el servidor → 503). Lógica en `src/lib/contenido/guionesAutomaticos.ts` (Request/Response normales: la usan la ruta de la
  web y `backend/app.ts`, mismas rutas). Validación y limpieza de HTML en `src/lib/validaciones/guionAutomatico.ts`.
  200 KB, 30 peticiones/hora (`guionApi`). Guía para el usuario: `backend/n8n/README.md`. Sustituye a `/api/v1/guiones`.
- Mismo modelo `Guion`: entra en `PENDIENTE_APROBACION`, sin editor, origen `IA`. Los campos de siempre se rellenan desde las
  escenas (`camposDelPanel`); lo nuevo va en el tipo compuesto `automatico` (escenas, fuente, relevancia, datos a verificar…).
- Duplicados: colección `NoticiaUsada` (`url @unique`, normalizada sin #ancla ni `utm_`). Colección aparte porque MongoDB no
  admite un único opcional (los guiones manuales no tienen URL). Se crea en la misma transacción que el guion.
- Panel: etiqueta 🤖 (relevancia y medio), filtro `?mostrar=automaticos`, `CajasAutomatico` (datos a verificar, noticia,
  escenas, redes; el editor ve lo mismo). «Descartar» (`descartarGuion`): solo automáticos sin editor; desde el 09-11-2026
  NO borra (estado DESCARTADO, ver arriba); la noticia sigue apuntada (no vuelve). Métricas sin cambios.
- Aprobar/descartar en bloque (08-11-2026, Jesse): casillas en la lista de `/admin/contenido` (solo en los que se pueden),
  `AccionesLoteGuiones` → `cambiarVariosGuiones`: cada uno pasa por `cambiarEstado`/`descartarGuion`; los demás se saltan.

### Separación backend (Render) y frontend (Vercel) (06-11-2026, rama `feature/backend-render`) — PARADA

Decisión del usuario: **separación total**, sabiendo que es una migración grande. Se hace por fases; la web real no se mueve
hasta que todo esté probado.

- [x] Fase 1: `backend/` (Hono, puerto 4000, `npm run backend`) con la API de n8n (hoy: guiones automáticos, arriba).
      tsx con `--conditions=react-server` para que `server-only` no falle fuera de Next.
- Decisión del usuario: **un solo servicio de pago en Render**. Hoy n8n llama a la web; `backend/` no se publica y tiene
      las mismas rutas. Al pasar la web a Vercel, Render ejecutaría solo `backend/`. No crear un segundo servicio.
- [x] Carpetas: `frontend/` y `backend/`, cada una con su `package.json`. El backend aún importa la lógica de
      `frontend/src` (alias `@/`), por eso su build instala también `frontend`. Prisma fijado a 6.19.3 sin `^`.
- [ ] Siguientes fases: mover a `backend/`, módulo a módulo, las lecturas y las 55 acciones (72 páginas leen la BD), y al
      final la web a Vercel sin Prisma. Antes hace falta fotos en la nube (R2), y Vercel Pro por ser comercial. La web
      hablará con el backend desde su servidor (la cookie de sesión sigue en su dominio).
- n8n (cron diario + IA que analiza noticias y genera el guion) es para iterar: cuando funcione bien, pasará a un
  módulo del backend, con la misma lógica de `guionesAutomaticos.ts`.

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

### Borrar códigos seleccionándolos (10-11-2026, rama `claude/project-thread-moqndl`; petición de Jesse)

`/admin/codigos`: casilla en cada código que se puede borrar + barra `AccionesLoteCodigos` («Marcar todos», «Borrar
seleccionados», con confirmación) → `borrarVariosCodigos` → `borrarCodigos` (`src/lib/admin/codigos.ts`). Borrado de
verdad: deja de contar en el número de códigos del kit (`/admin/kits`), que sí cuenta los desactivados. Solo se borran
los que nadie ha usado y no se vendieron en un pedido (`condicionBorrable`); los demás se saltan. El lote se queda con
la cantidad que le queda y, vacío, se borra.

### Desactivar códigos en bloque (05-11-2026, rama `claude/project-thread-df82fa`)

`/admin/codigos`: botones «Desactivar todos» / «Reactivar todos» (con confirmación) encima de la tabla; actúan sobre
los códigos de los filtros que se ven (kit, lote, estado, búsqueda; sin filtros = todos). Acción
`cambiarDesactivacionTodos`, lógica `cambiarDesactivacionEnBloque` en `src/lib/admin/codigos.ts` (updateMany).

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
    Es obligatorio: un hook (`.claude/hooks/comprobar-github.mjs`) bloquea editar, `git commit` y `git push` si la copia va
    por detrás de `origin/main`. No saltárselo: actualizar y repetir.
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
