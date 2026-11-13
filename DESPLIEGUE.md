# Publicar Valentia: Render + MongoDB Atlas

Guía paso a paso para poner la web en Internet. Se hace **una sola vez**; después, cada pull request que
se une a `main` se publica solo.

> Los nombres de los botones de cada servicio pueden cambiar un poco con el tiempo: si no encuentras
> uno exactamente, busca el más parecido.

Durante la guía irás creando contraseñas y claves. **Guárdalas en un gestor de contraseñas**, nunca en el
repositorio, en un correo ni en un chat del equipo.

## Qué vas a necesitar

| Servicio                                                           | Para qué                                    | Precio aproximado                   |
| ------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------- |
| [Render](https://render.com)                                       | Ejecuta la web                              | Instancia **Starter**: unos 7 $/mes |
| [MongoDB Atlas](https://cloud.mongodb.com)                         | Base de datos (clúster **M0**)              | Gratis (con límites, ver §8)        |
| [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) | Fotos que subes desde el panel              | Gratis hasta 10 GB                  |
| [Resend](https://resend.com)                                       | Correos (códigos, confirmaciones de pedido) | Gratis hasta 3.000/mes              |
| [Stripe](https://stripe.com)                                       | Cobrar con tarjeta                          | Comisión por venta                  |
| Tu dominio                                                         | La dirección de la web                      | 10–15 €/año                         |

¿Por qué Starter y no la instancia gratuita de Render? La gratuita se «duerme» tras 15 minutos sin
visitas (la siguiente tarda casi un minuto en abrir) y **no tiene Shell**, que necesitas para cargar el
catálogo y crear tu cuenta de administrador.

---

## 1. Base de datos de producción (MongoDB Atlas)

Usa un **proyecto separado** del de desarrollo: así nadie toca los datos de los clientes por error.

1. En [cloud.mongodb.com](https://cloud.mongodb.com): menú de proyectos (arriba a la izquierda) →
   **New Project** → nombre **`valentia-prod`** → crea el proyecto.
2. **Create** (o _Build a Database_) → plan **M0 (Free)** → proveedor **AWS**, región **Frankfurt
   (eu-central-1)** → nombre `valentia-prod` → **Create Deployment**.
3. **Usuario de la web** (_Database Access → Add New Database User_):
   - método **Password**, usuario `valentia-web`, pulsa **Autogenerate Secure Password** y guárdala;
   - en _Database User Privileges_ elige **Specific Privileges → readWrite** sobre la base de datos
     **`valentia`** (solo esa: si alguien robara la clave, no podría tocar nada más);
   - **Add User**.
4. **Cadena de conexión** (_Database → Connect → Drivers_): copia la dirección, que se parece a
   `mongodb+srv://valentia-web:<db_password>@valentia-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=valentia-prod`.
   - sustituye `<db_password>` por la contraseña;
   - escribe **`valentia`** (el nombre de la base de datos) entre la `/` y el `?`:
     `…mongodb.net/valentia?retryWrites=true…`.

   Esta es la **`DATABASE_URL` de producción**. La pegarás en Render en el paso 3.

   **Formato correcto** (todo en una línea, sin comillas ni espacios):

   ```
   mongodb+srv://USUARIO:CONTRASEÑA@CLUSTER.xxxxx.mongodb.net/valentia?retryWrites=true&w=majority&appName=valentia-prod
   ```

   | Parte                       | Obligatoria | Qué es                                                                       |
   | --------------------------- | ----------- | ---------------------------------------------------------------------------- |
   | `mongodb+srv://`            | Sí          | Atlas siempre usa `+srv` (encuentra solo los 3 servidores del clúster)       |
   | `USUARIO:CONTRASEÑA@`       | Sí          | El usuario de _Database Access_ (`valentia-web`), no tu cuenta de Atlas      |
   | `CLUSTER.xxxxx.mongodb.net` | Sí          | El clúster del proyecto **`valentia-prod`** (no el de desarrollo)            |
   | `/valentia`                 | **Sí**      | La base de datos. Sin ella, Prisma no sabe dónde guardar                     |
   | `retryWrites=true`          | Sí          | Repite una escritura si se corta la conexión (Prisma lo necesita en MongoDB) |
   | `w=majority`                | Sí          | Una escritura cuenta como hecha cuando la tiene la mayoría de los servidores |
   | `appName=…`                 | No          | Solo para reconocer la conexión en las gráficas de Atlas                     |

   No hace falta `ssl=true` ni `tls=true`: con `+srv` ya va cifrado. **Si la contraseña tiene símbolos**
   (`@ : / ? # [ ] %`), hay que escribirlos codificados (`@` → `%40`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`,
   `#` → `%23`, `%` → `%25`). Lo más fácil: genera la contraseña con _Autogenerate_ (solo letras y números).

La parte de **Network Access** (quién puede conectarse) se hace en el paso 4, cuando Render te dé sus IP.

## 2. Fotos, correo y pagos

Son iguales que en cualquier hosting; están explicados en el README y en `INFORME.md` §3:

- **Fotos que subes desde el panel de producción**: el disco normal de Render se borra en cada despliegue.
  **Lo más sencillo (desde el 11-11-2026, no hay que hacer nada más):** si ya tienes `ALMACEN_PRIVADO_BUCKET`
  (§6 quinquies, el bucket privado del chat y de hardware), las fotos van ahí solas y se siguen viendo en
  `/subidas/…`. Sin ese bucket, en Render no se deja subir fotos (mejor un aviso que una foto que desaparece).
  Otras dos opciones:
  - **Disk de Render** (lo que tienes): en el servicio → _Disks_ → un disco montado, por ejemplo, en
    `/var/data`. Variables: `ALMACEN_PROVEEDOR=local` y `ALMACEN_LOCAL_CARPETA=/var/data/subidas`.
    Ojo: el Disk no tiene copia automática; descarga de vez en cuando las fotos importantes.
  - **Cloudflare R2** (nube): un bucket con acceso público de lectura y una clave solo para él
    (README «Fotos en la nube»). Variables `ALMACEN_*` con `ALMACEN_PROVEEDOR=nube`.

  Las fotos del **catálogo inicial** (exportado desde local) no necesitan nada de esto: van en git
  (`public/images/`), ver §6 bis. Las que subas después desde el panel de producción, sí.

- **Correo (Resend)**: verifica tu dominio y crea una clave (`re_…`). **Sin esto nadie puede registrarse
  ni iniciar sesión**, porque la web envía un código por correo.
- **Stripe**: activa la cuenta, copia las claves reales (`pk_live_…`, `sk_live_…`) y crea el webhook hacia
  `https://valentiarobotics.com/api/pagos/stripe` con los eventos **`payment_intent.succeeded`** y
  **`payment_intent.canceled`**; copia su secreto (`whsec_…`).

## 3. Render

1. Crea una cuenta en render.com **con tu cuenta de GitHub**.
2. **New → Web Service** → conecta GitHub. Si no aparece `Valentia-Robotics/valentia`, pulsa
   _Configure account_ y da acceso a la organización **Valentia Robotics**.
3. Rellena:

   | Campo              | Valor                                      |
   | ------------------ | ------------------------------------------ |
   | Name               | `valentia`                                 |
   | Region             | **Frankfurt (EU Central)** (junto a Atlas) |
   | Branch             | `main`                                     |
   | Runtime            | Node                                       |
   | Build Command      | `npm ci && npm run build`                  |
   | Pre-Deploy Command | `npm run predeploy:prod`                   |
   | Start Command      | `npm start`                                |
   | Instance Type      | **Starter**                                |

   El **Pre-Deploy Command** está en _Settings → Build & Deploy_ (si al crear el servicio no aparece,
   ponlo ahí después). Y en **Settings → Health Checks → Health Check Path**: **`/api/health`** (la página
   que Render visita para saber si la web está viva; contesta al instante y no depende de la base de datos).

   No hace falta poner `PORT`: Render la pone sola (10000) y `npm start` escucha en ella y en `0.0.0.0`.
   La versión de Node sale de `package.json` (`"engines": { "node": "24.x" }`): no pongas `NODE_VERSION`.

4. **Environment Variables** (en _Advanced_ o, después, en la pestaña _Environment_):

   | Variable                                                                                                                   | Valor                                                                              |
   | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
   | `DATABASE_URL`                                                                                                             | La de producción del paso 1                                                        |
   | `AUTH_SECRET`                                                                                                              | Una **nueva**: `npx auth secret` en tu ordenador                                   |
   | `NEXT_PUBLIC_SITE_URL`                                                                                                     | `https://valentiarobotics.com`                                                     |
   | `STRIPE_SECRET_KEY`                                                                                                        | `sk_live_…`                                                                        |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                                                                                       | `pk_live_…`                                                                        |
   | `STRIPE_WEBHOOK_SECRET`                                                                                                    | `whsec_…`                                                                          |
   | `STRIPE_PERMITIR_CLAVES_REALES`                                                                                            | `si`                                                                               |
   | `STRIPE_PERMITIR_CLAVES_PRUEBA`                                                                                            | No la pongas: con claves `sk_test_` la compra queda cerrada; `si` solo para probar |
   | `CORREO_PROVEEDOR`                                                                                                         | `resend`                                                                           |
   | `RESEND_API_KEY`                                                                                                           | `re_…`                                                                             |
   | `CORREO_REMITENTE`                                                                                                         | `Valentia <hola@valentiarobotics.com>`                                             |
   | `AVISO_PEDIDOS_EMAIL`                                                                                                      | Correo(s) que reciben los pedidos nuevos (vacío = los administradores)             |
   | `ALMACEN_PROVEEDOR`                                                                                                        | `local` (Disk de Render) o `nube` (R2), ver §2                                     |
   | `ALMACEN_LOCAL_CARPETA`                                                                                                    | Con Disk: `/var/data/subidas` (su Mount Path)                                      |
   | `ALMACEN_ENDPOINT`, `ALMACEN_REGION`, `ALMACEN_BUCKET`, `ALMACEN_CLAVE_ID`, `ALMACEN_CLAVE_SECRETA`, `ALMACEN_URL_PUBLICA` | Solo con R2 (ver `.env.example`)                                                   |

   **No pongas `NODE_ENV`**: Render instalaría sin las herramientas de compilación y la publicación
   fallaría. La web ya funciona en modo producción con `npm start`.

5. **Todavía no pulses Deploy**: primero, el paso 4 (si no, Atlas rechazará la conexión). Si ya lo has
   pulsado y falla con un error de conexión, es normal: haz el paso 4 y luego _Manual Deploy → Deploy latest commit_.

Con **Auto-Deploy** activado (lo está por defecto), cada vez que se une un pull request a `main`, Render
publica la nueva versión sola.

### Qué hace cada comando

- **Build Command**
  - `npm ci`: instala las librerías exactas de `package-lock.json`.
  - `npm run build`: genera el cliente de Prisma y compila la web. Lee la base de datos (portada, kits y
    componentes se generan al compilar y se vuelven a leer solos cada 5 minutos como mucho).
- **Pre-Deploy Command** (`npm run predeploy:prod`): Render lo ejecuta después de compilar y antes de
  publicar la versión nueva, con las variables de producción.
  1. `prisma db push`: aplica `prisma/schema.prisma` (crea colecciones e índices nuevos). MongoDB no usa
     migraciones, así que **se ejecuta en cada despliegue**. Si un cambio del esquema pudiera **borrar
     datos**, se para con un mensaje claro, el despliegue se cancela **sin tocar nada** y la web sigue con
     la versión anterior. En ese caso, haz una copia (§7) y pregunta antes de seguir.
  2. `seed:prod`: crea lo que **falte** del catálogo de `data/catalogo/` (ver §6 bis). Lo que ya existe en
     producción **no se modifica nunca** y **no se borra nada**; tampoco toca usuarios, pedidos o códigos.

## 4. Network Access: solo las IP de Render

Por defecto Atlas no deja conectarse a nadie. Lo más seguro es permitir **solo las IP de salida de tu
servicio de Render**:

1. En Render, abre el servicio → botón **Connect** (arriba a la derecha) → pestaña **Outbound**. Verás
   unos rangos de IP (por ejemplo `74.220.48.0/24`). Son los mismos para la compilación y para la web.
2. En Atlas (proyecto `valentia-prod`) → **Network Access → Add IP Address** → pega **cada rango** tal
   cual (con su `/24`, `/27`…) y un comentario como «Render». Repite con todos.
3. Vuelve a Render y despliega (_Manual Deploy → Deploy latest commit_).

**Si no fuera posible** (Render no muestra las IP o cambian a menudo), la alternativa es permitir
`0.0.0.0/0` («Allow access from anywhere»). Es lo que muchos proyectos hacen, pero entonces la única
barrera es la contraseña, así que:

- usa la contraseña larga autogenerada y el usuario `valentia-web` con permiso **solo** sobre `valentia`;
- no la compartas nunca y cámbiala (_Database Access → Edit → Edit Password_, y actualiza `DATABASE_URL`
  en Render) si alguien del equipo se va o sospechas que se ha filtrado;
- revisa de vez en cuando las alertas de Atlas;
- vuelve a restringir a las IP de Render en cuanto puedas.

**Desde tu ordenador** (copias de seguridad, §7): en _Network Access → Add IP Address → Add Current IP
Address_, marca **«This entry is temporary»** (por ejemplo, 6 horas). Así no se queda abierto.

## 5. Tu dominio

1. En Render: servicio → **Settings → Custom Domains → Add Custom Domain** → `valentiarobotics.com` (y
   `www.valentiarobotics.com`).
2. Render te dice qué **registros DNS** crear. Añádelos donde gestiones el DNS del dominio.
3. Cuando salga **Verified**, Render activa el **https** solo. Comprueba que `NEXT_PUBLIC_SITE_URL` es
   exactamente esa dirección (si la cambias, vuelve a desplegar: se graba al compilar).

## 6. Primera puesta en marcha: catálogo y administrador

**El catálogo se carga solo** la primera vez (Pre-Deploy Command, §3): no hay que hacer nada. Desde
entonces lo gestionas en el panel de administración de producción (§6 bis). Si la
web acaba de publicarse y la portada aún dice «Los kits están en camino», espera unos minutos y recarga.

**Tu usuario administrador**: en Render, abre el servicio → pestaña **Shell** (una terminal dentro del
servidor, ya con la base de datos de producción) y escribe:

```bash
npm run prod:admin
```

Te pide el **email**. Si ya tienes cuenta con ese email (te registraste en la web), la convierte en
administrador **sin tocar tu contraseña**. Si no, te pide tu **nombre** y una **contraseña dos veces**
(no se verá nada mientras escribes: es a propósito) y crea la cuenta como administrador con el email ya
verificado.

Después:

1. Entra en `https://valentiarobotics.com/login` con ese email y contraseña. La primera vez en cada navegador te
   llega un código por correo (así compruebas que Resend funciona).
2. Entra en `/admin`: revisa los productos, pon las fotos y los vídeos reales de los cursos.
3. Haz una **compra real pequeña** con tu tarjeta y comprueba: correo de confirmación, pedido en el panel
   y código de activación. Después puedes reembolsarla desde Stripe y cancelar el pedido en el panel.

**Comprobación de la IP** (límites de intentos): tras publicar, intenta entrar 11 veces seguidas con una
contraseña incorrecta. A la undécima debe salir «Demasiados intentos». Si no sale nunca, avisa: puede que
Render pase la IP del visitante en una cabecera distinta de las que lee `src/lib/limite.ts`.

## 6 bis. El catálogo de producción: se gestiona desde el panel

**A partir del primer despliegue, el catálogo de producción se gestiona desde el panel de administración
de producción** (`https://valentiarobotics.com/admin`): precios, textos, fotos, stock, kits nuevos, ocultar o
borrar productos, cursos y lecciones… Lo que cambies allí es lo que manda, y ningún despliegue lo pisa.

`data/catalogo/` (un archivo por colección: `Componente`, `Kit`, `KitComponente`, `Curso`, `Leccion`,
`Ejercicio`, con los mismos ids que en `valentia-dev`) solo sirve para **rellenar lo que falta**: el
catálogo inicial la primera vez y, si alguna vez lo necesitas, fichas nuevas. Las categorías, las reglas
de compatibilidad y los ajustes de la tienda están en el código.

Qué hace `seed:prod` en cada despliegue (también lo puedes lanzar a mano en la Shell de Render; con
`npm run seed:prod -- --dry-run` solo enseña lo que haría):

- **Solo crea** lo que **no existe** en producción.
- **Nunca modifica** lo que ya existe, aunque en `data/catalogo/` sea distinto: ni el precio, ni los
  textos, ni las fotos, ni el stock (baja con las ventas).
- **No añade piezas, lecciones ni ejercicios** a un kit, curso o lección que ya existía (eso también sería
  modificarlo). Solo se crean junto con su kit, curso o lección cuando este es nuevo.
- **Nunca borra**. Lo creado en el panel de producción se queda.
- **Lo que borres en el panel de producción no vuelve** en el siguiente despliegue: `seed:prod` recuerda
  (en la colección `CatalogoAplicado`) qué fichas ya estuvieron en producción.
- **Nunca toca** usuarios, pedidos, códigos de activación ni progreso de los cursos.
- Si producción ya tenía el catálogo con otros ids (cargado antes con `npm run db:catalogo`), lo
  reconoce por su nombre (slug): ni lo duplica ni lo modifica.
- Si una ficha nueva chocara con otra que ya existe (por ejemplo, el mismo slug), se para sin escribir
  nada y el despliegue se cancela con el motivo en los _Logs_. Cambia el slug en uno de los dos sitios.

En los _Logs_ del despliegue verás una tabla con lo que se ha **creado**, lo que **ya existía** (y se ha
dejado tal cual) y lo **omitido** (con el motivo).

### Cambiar algo del catálogo de producción

Hazlo **directamente en el panel de producción**. No hace falta tocar `data/catalogo/` ni desplegar: la
portada, los kits y los componentes muestran el cambio en 5 minutos como mucho.

> Cambiar una ficha en tu panel local y volver a exportarla **ya no** cambia producción: como esa ficha ya
> existe allí, `seed:prod` la deja como está.

### Añadir fichas nuevas desde local (opcional)

Si prefieres preparar algo nuevo (por ejemplo, un kit completo con su curso) en tu `/admin` local (con tu
`.env` apuntando a `valentia-dev`):

1. Exporta (solo lee tu base de datos de desarrollo; **no se conecta a producción**):
   ```powershell
   npm run catalogo:exportar
   ```
   Las fotos que subiste desde el panel local se copian a `public/images/catalogo/` y el JSON apunta ahí.
2. Rama nueva, commit de `data/catalogo/` y `public/images/`, pull request y únelo a `main`.
3. Render despliega y el Pre-Deploy crea **solo lo nuevo**. Lo que ya existía en producción no cambia.

## 6 ter. La API para n8n

No hace falta ningún servicio nuevo: la API va dentro de la web, en el **mismo servicio de Render**.

1. Genera una clave y añádela en Render → tu servicio → **Environment** → **Environment Variables** como `N8N_API_KEY`.
   Sin ella la API queda cerrada y responde 503.
2. Comprueba la conexión con `npm run n8n:probar -- https://valentiarobotics.com`.
3. En n8n, el flujo llama a `POST https://valentiarobotics.com/api/guiones/automaticos` con la cabecera `x-api-key`.
   Pasos, formato del JSON y flujo para importar: `backend/n8n/README.md`.
4. El guion aparece en `/admin/contenido` como «Pendiente de aprobación», con la etiqueta 🤖 Automático.

Al desplegar, `db:push` crea la colección `NoticiaUsada` (una URL de noticia no da dos guiones). Los guiones que ya
existen no cambian.

La carpeta `backend/` no se publica todavía: será el servicio de Render cuando la web pase a Vercel. Entonces solo
cambiará la dirección a la que llama n8n, y seguirá habiendo un único servicio en Render.

## 6 quater. Blog automático y analítica

Variables en Render → **Environment** → **Environment Variables** (todas opcionales; sin ellas, lo suyo queda apagado):

| Variable              | Para qué                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| `BLOG_API_KEY`        | Clave de n8n para `/api/blog/*` (distinta de `N8N_API_KEY`). Sin ella, 503 |
| `N8N_PUBLISH_WEBHOOK` | Webhook de n8n que recibe cada artículo publicado (https://…)              |
| `NEXT_PUBLIC_GA_ID`   | Google Analytics 4 (`G-…`). Hay que volver a desplegar al cambiarla        |

Pasos para n8n y formato: `backend/n8n/BLOG.md`. n8n tiene que llamar **cada hora** a `POST /api/blog/publicar-cola`:
es lo que publica la cola. La publicación automática empieza apagada (`/admin/blog`).

Al desplegar, `db:push` crea las colecciones del blog. Nada de lo que ya existe cambia.

## 6 quinquies. Espacios de archivos del equipo de hardware (Cloudflare R2)

Cada persona con el rol **Hardware** tiene su espacio en `/hardware`; tú los ves todos en **/admin/hardware**. Los
archivos van a un bucket **privado** de Cloudflare R2: nadie puede abrirlos con una dirección, solo a través de la web
y después de comprobar quién es. Mientras no lo configures, la web dice «falta configurar el almacén» y no deja subir
(el disco de Render se borra en cada publicación).

1. Entra en **dash.cloudflare.com** (crea la cuenta si no la tienes) → menú **R2 Object Storage**. La primera vez pide
   activar R2 con una tarjeta: hasta 10 GB al mes es gratis.
2. **Create bucket** → nombre `valentia-hardware` → ubicación automática → **Create bucket**.
   **No** actives «Public access»: tiene que quedarse privado.
3. Vuelve a **R2 Object Storage** → **Manage API tokens** (o «API» → «Manage R2 API Tokens») → **Create API token**:
   - Nombre: `valentia-web`
   - Permisos: **Object Read & Write**
   - **Apply to specific buckets only** → `valentia-hardware` (si ya tienes un bucket de fotos, añádelo también)
   - **Create API Token**. Copia el **Access Key ID** y el **Secret Access Key** (este solo se ve una vez) y la
     dirección **S3 API** (`https://<número>.r2.cloudflarestorage.com`). No los pegues en ningún chat.
4. Render → tu servicio → **Environment** → añade:

   | Variable                 | Qué poner                                                  |
   | ------------------------ | ---------------------------------------------------------- |
   | `ALMACEN_PRIVADO_BUCKET` | `valentia-hardware`                                        |
   | `ALMACEN_ENDPOINT`       | La dirección S3 API, **sin** el nombre del bucket al final |
   | `ALMACEN_CLAVE_ID`       | El Access Key ID                                           |
   | `ALMACEN_CLAVE_SECRETA`  | El Secret Access Key                                       |
   | `ALMACEN_REGION`         | `auto`                                                     |

   Si las tres últimas ya existen (fotos en R2), no las cambies: solo añade `ALMACEN_PRIVADO_BUCKET`.
   **Save Changes** y espera a **Live**.

5. Prueba: en **/admin/usuarios**, «Hacer hardware» a alguien; esa persona entra en **/hardware** y sube un archivo.

Límites (en `src/config/hardware.ts`): 50 MB por archivo y 2 GB por persona. Quitar el rol no borra sus archivos.

## 6 sexies. Avisos de los mensajes en el móvil (Web Push)

**No hay que añadir nada en Render.** Las claves que firman los avisos (VAPID) se crean solas la
primera vez y se guardan en la base de datos. Cada persona del equipo lo activa en sus aparatos
desde **Mensajes → Avisos** (ahí está la guía para Android, iPhone y ordenador). En el iPhone hay
que añadir antes la web a la pantalla de inicio (iOS 16.4 o más nuevo).

Opcional (solo si algún día quieres fijarlas tú): `VAPID_CLAVE_PUBLICA`, `VAPID_CLAVE_PRIVADA` y
`VAPID_CONTACTO` (`mailto:tu@correo` o la dirección de la web). Si las cambias, todos tienen que
volver a pulsar «Activar avisos».

Los recordatorios de tareas suenan a su hora aunque nadie tenga la web abierta: el servidor lo
mira solo cada minuto (usa `AUTH_SECRET`, que ya existe).

## 6 septies. GIFs en los mensajes (GIPHY)

El botón **GIF** del chat busca en GIPHY. Necesita una clave gratis:

1. Entra en <https://developers.giphy.com> → **Create an Account** (o inicia sesión).
2. **Create an App** → elige **API** (no SDK) → nombre «Valentia equipo» y una descripción corta.
3. Copia la **API Key** que te da.
4. Render → tu servicio → **Environment** → añade `GIPHY_API_KEY` con esa clave → **Save changes**
   (Render vuelve a publicar la web solo).

La clave de empezar («beta») deja unas 100 búsquedas por hora: de sobra para el equipo (la web
además recuerda cada búsqueda 10 minutos). Si algún día se queda corta, en la misma página de
GIPHY se pide la clave de producción (gratis). Sin la clave, el botón GIF explica que falta.
Al enviar un GIF, la web lo descarga y lo guarda como una imagen más del chat (almacén privado).

## 6 octies. Videollamadas del equipo (JaaS de 8x8)

El botón **Llamar** (la cámara) de cada chat de Mensajes abre una videollamada. Con las claves de
**JaaS** (Jitsi as a Service, de 8x8) la llamada se abre **dentro de la web**, sin cuentas. El plan
**Dev** es gratis hasta 25 personas distintas al mes: de sobra para el equipo.

1. Entra en <https://jaas.8x8.vc> y crea una cuenta (plan **Dev**, gratis).
2. Copia tu **AppID** (empieza por `vpaas-magic-cookie-`).
3. **API Keys** → **Add API key** → **Generate API key pair** → se descarga un archivo `.pk` (solo
   una vez: guárdalo). En la lista sale su **Key ID** (`vpaas-magic-cookie-…/abc123`).
4. Render → tu servicio → **Environment** → añade:
   - `JAAS_APP_ID` = el AppID
   - `JAAS_KID` = el Key ID entero (con la barra)
   - `JAAS_CLAVE_PRIVADA` = abre el `.pk` con el Bloc de notas, copia TODO (desde
     `-----BEGIN PRIVATE KEY-----` hasta `-----END PRIVATE KEY-----`) y pégalo tal cual.
   → **Save changes** (Render vuelve a publicar la web sola).

Sin esas tres variables, la llamada se abre en **meet.jit.si** en otra pestaña (también gratis); allí
la primera persona que entra tiene que iniciar sesión con Google, GitHub o Facebook.
La clave privada nunca sale del servidor: con ella la web firma un «pase» para cada persona y sala.

## 7. Copias de seguridad

El plan **M0 no hace copias automáticas**. Desde tu ordenador, con tu IP añadida temporalmente (§4):

```powershell
$env:DATABASE_URL="<DATABASE_URL de producción>"
npm run db:copia
Remove-Item Env:DATABASE_URL
```

Se guarda en `copias/` (fuera de git). Cada cuánto y cómo restaurar: README «Copias de seguridad».
Resumen: **semanal** al principio, **diaria** con ventas de verdad y **siempre antes** de un cambio del
esquema. Guárdalas fuera del ordenador, en un sitio privado.

## 8. Límites del plan M0 y cuándo pasar a uno de pago

El M0 es gratis para siempre, pero:

- **512 MB** de almacenamiento (datos + índices). Valentia guarda poco por pedido, así que dan para
  bastantes miles de pedidos; las fotos no cuentan (van a R2).
- **Sin copias de seguridad automáticas** (de ahí §7).
- Recursos **compartidos**: un número limitado de conexiones y de operaciones por segundo.
- Si pasa mucho tiempo sin ningún uso, Atlas puede **pausarlo** (te avisa por correo).

**Señales de que toca pasar a un plan de pago** (Flex o un clúster dedicado, en _Edit Configuration_ del
clúster; se cambia sin perder los datos):

- Atlas te avisa de que te acercas a los **512 MB** (míralo en _Metrics → Data Size_), o pasas del ~70 %.
- Hay **ventas de verdad todos los días**: perder un día de pedidos ya sería un problema serio, y los planes
  de pago incluyen copias automáticas.
- La web va **lenta** en horas con mucho tráfico o salen errores de conexión en los _Logs_ de Render.
- Atlas te manda avisos de límites de conexiones u operaciones.

## Si el despliegue falla

Primero mira **en qué paso** falla (_Events_ → el despliegue → _Deploy logs_).

### a) Falla el build («Build failed»)

Lee las últimas líneas del log:

- **`P1001`, `Server selection timeout`, `ReplicaSetNoPrimary`, `received fatal alert: InternalError`,
  `tlsv1 alert internal error`**: Atlas **rechaza la conexión**. Casi siempre es **Network Access**: la IP de
  Render no está en la lista (§4) o se añadió en **otro proyecto** de Atlas (tiene que ser en `valentia-prod`,
  el proyecto del clúster de `DATABASE_URL`). También pasa si el clúster está **en pausa** (en Atlas sale
  _Paused_ → _Resume_). Atlas no dice «IP no permitida»: simplemente corta la conexión cifrada con ese error.
- **`bad auth`, `Authentication failed`**: usuario o contraseña de `DATABASE_URL` incorrectos (o con símbolos
  sin codificar, §1).
- **`P1013`, `invalid database string`**: `DATABASE_URL` mal escrita (comillas, espacios, falta `/valentia`).
- **`Data loss`** en el Pre-Deploy (`prisma db push`): un cambio del esquema borraría datos; ver «Qué hace cada comando» (§3).

### b) El build termina bien pero acaba en «Timed Out»

Render arranca la web (`Ready in …`) y luego visita el **Health Check Path** durante unos 15 minutos. Si
nunca recibe un «200 OK», cancela el despliegue y deja la versión anterior.

1. En _Settings → Health Checks_, el **Health Check Path** debe ser exactamente **`/api/health`**.
2. Abre `https://<tu-servicio>.onrender.com/api/health` (o tu dominio): debe mostrar `{"estado":"ok"}`.
   Esta comprobación **no toca la base de datos**: si no responde, el problema es de la web (mira los
   _Logs_), no de Atlas.
3. **No pongas `PORT`** en las variables de entorno (o, si la pones, que sea `10000`).

### c) La web está publicada pero da errores

- Abre **`/api/health?db=1`**: hace una prueba con la base de datos (máximo 4 segundos).
  - `{"estado":"ok","baseDeDatos":"ok"}`: la base de datos funciona.
  - `tiempo-agotado` justo después de publicar: la primera conexión con Atlas tarda más; repite a los pocos
    segundos. Si sigue igual, el motivo real aparece en los Logs unos 30 s después
    (`[health] Motivo del tiempo agotado …`).
  - Error **503** con `baseDeDatos` = `conexion-rechazada`, `tiempo-agotado`, `credenciales`, `sin-permisos`,
    `host-no-encontrado`, `direccion-mal-formada` o `sin-direccion`: el motivo completo (sin contraseñas)
    está en los **Logs** de Render, en una línea que empieza por `[health]`.
- En la **Shell** de Render, ejecuta:

  ```bash
  npm run db:check
  ```

  Comprueba la dirección, la conexión, la contraseña y los permisos (con el driver de MongoDB y con
  Prisma) y te dice en español qué falla y qué revisar. No muestra la contraseña. También funciona en tu
  ordenador, con tu IP añadida en Atlas.

### Lista rápida de Atlas (proyecto `valentia-prod`)

- [ ] El clúster está activo (no _Paused_).
- [ ] _Network Access_: cada rango de Render (_Connect → Outbound_), con su `/24`…, en estado **Active**
      (tarda un minuto en aplicarse). Para descartar que sea esto, puedes añadir `0.0.0.0/0` **un rato**,
      volver a desplegar y, si funciona, quitarlo y revisar las IP.
- [ ] _Database Access_: el usuario de `DATABASE_URL` existe y tiene **readWrite** sobre **`valentia`**.
- [ ] `DATABASE_URL` en Render apunta al clúster de **este** proyecto y lleva `/valentia` antes del `?`.

## El día a día

- **Cambiar el catálogo** (precios, stock, kits, cursos…) = el panel de administración de producción
  (`/admin`). No hace falta desplegar (§6 bis).
- **Publicar un cambio** = unir su pull request a `main` en GitHub. Render lo publica en unos minutos
  (lo ves en la pestaña _Events_ del servicio).
- **Si una publicación falla**, la web sigue con la versión anterior; el motivo está en _Events → Deploy
  logs_. Las causas típicas: una variable que falta, Atlas sin la IP de Render o un cambio de esquema que
  Prisma no aplica para no perder datos.
- **Volver atrás**: _Events_ → una versión anterior → **Rollback**. Ojo: no deshace los cambios de la base
  de datos.
- **Cambios en el esquema**: el pull request lo indica («Cambios en la base de datos: sí»). Haz una copia
  (§7) antes de unirlo.
