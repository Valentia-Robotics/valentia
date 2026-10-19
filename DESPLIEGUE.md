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

La parte de **Network Access** (quién puede conectarse) se hace en el paso 4, cuando Render te dé sus IP.

## 2. Fotos, correo y pagos

Son iguales que en cualquier hosting; están explicados en el README y en `INFORME.md` §3:

- **Fotos (Cloudflare R2)**: el disco de Render se borra en cada despliegue, así que las fotos del panel
  tienen que ir a la nube. Crea un bucket con acceso público de lectura y una clave solo para él
  (README «Fotos en la nube»). Variables `ALMACEN_*`.
- **Correo (Resend)**: verifica tu dominio y crea una clave (`re_…`). **Sin esto nadie puede registrarse
  ni iniciar sesión**, porque la web envía un código por correo.
- **Stripe**: activa la cuenta, copia las claves reales (`pk_live_…`, `sk_live_…`) y crea el webhook hacia
  `https://tudominio.es/api/pagos/stripe` con los eventos **`payment_intent.succeeded`** y
  **`payment_intent.canceled`**; copia su secreto (`whsec_…`).

## 3. Render

1. Crea una cuenta en render.com **con tu cuenta de GitHub**.
2. **New → Web Service** → conecta GitHub. Si no aparece `Valentia-Robotics/valentia`, pulsa
   _Configure account_ y da acceso a la organización **Valentia Robotics**.
3. Rellena:

   | Campo         | Valor                                        |
   | ------------- | -------------------------------------------- |
   | Name          | `valentia`                                   |
   | Region        | **Frankfurt (EU Central)** (junto a Atlas)   |
   | Branch        | `main`                                       |
   | Runtime       | Node                                         |
   | Build Command | `npm ci && npm run db:push && npm run build` |
   | Start Command | `npm start`                                  |
   | Instance Type | **Starter**                                  |

4. **Environment Variables** (en _Advanced_ o, después, en la pestaña _Environment_):

   | Variable                                                                                                                   | Valor                                            |
   | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
   | `DATABASE_URL`                                                                                                             | La de producción del paso 1                      |
   | `AUTH_SECRET`                                                                                                              | Una **nueva**: `npx auth secret` en tu ordenador |
   | `NEXT_PUBLIC_SITE_URL`                                                                                                     | `https://tudominio.es`                           |
   | `STRIPE_SECRET_KEY`                                                                                                        | `sk_live_…`                                      |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                                                                                       | `pk_live_…`                                      |
   | `STRIPE_WEBHOOK_SECRET`                                                                                                    | `whsec_…`                                        |
   | `STRIPE_PERMITIR_CLAVES_REALES`                                                                                            | `si`                                             |
   | `CORREO_PROVEEDOR`                                                                                                         | `resend`                                         |
   | `RESEND_API_KEY`                                                                                                           | `re_…`                                           |
   | `CORREO_REMITENTE`                                                                                                         | `Valentia <hola@tudominio.es>`                   |
   | `ALMACEN_PROVEEDOR`                                                                                                        | `nube`                                           |
   | `ALMACEN_ENDPOINT`, `ALMACEN_REGION`, `ALMACEN_BUCKET`, `ALMACEN_CLAVE_ID`, `ALMACEN_CLAVE_SECRETA`, `ALMACEN_URL_PUBLICA` | Los de R2 (ver `.env.example`)                   |

   **No pongas `NODE_ENV`**: Render instalaría sin las herramientas de compilación y la publicación
   fallaría. La web ya funciona en modo producción con `npm start`.

5. **Todavía no pulses Deploy**: primero, el paso 4 (si no, Atlas rechazará la conexión). Si ya lo has
   pulsado y falla con un error de conexión, es normal: haz el paso 4 y luego _Manual Deploy → Deploy latest commit_.

Con **Auto-Deploy** activado (lo está por defecto), cada vez que se une un pull request a `main`, Render
publica la nueva versión sola.

### Qué hace el Build Command

- `npm ci`: instala las librerías exactas de `package-lock.json`.
- `npm run db:push`: aplica `prisma/schema.prisma` a la base de datos (crea colecciones e índices nuevos).
  MongoDB no usa migraciones, así que **se ejecuta en cada despliegue**. Si un cambio del esquema pudiera
  borrar datos, Prisma se niega y el despliegue falla **sin tocar nada**: la web sigue con la versión
  anterior. En ese caso, haz una copia (§7) y pregunta antes de seguir.
- `npm run build`: compila la web. Necesita la base de datos (las fichas de los kits se generan al compilar).

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

1. En Render: servicio → **Settings → Custom Domains → Add Custom Domain** → `tudominio.es` (y
   `www.tudominio.es`).
2. Render te dice qué **registros DNS** crear. Añádelos donde gestiones el DNS del dominio.
3. Cuando salga **Verified**, Render activa el **https** solo. Comprueba que `NEXT_PUBLIC_SITE_URL` es
   exactamente esa dirección (si la cambias, vuelve a desplegar: se graba al compilar).

## 6. Primera puesta en marcha: catálogo y administrador

En Render, abre el servicio → pestaña **Shell** (una terminal dentro del servidor, ya con `DATABASE_URL`
de producción):

```bash
npm run db:catalogo
```

Carga los componentes, kits y cursos de `data/*.json` **solo si la base de datos está vacía** (si ya hay
catálogo, no toca nada). No crea usuarios ni códigos de prueba. (El seed de desarrollo, `npm run db:seed`,
se niega a ejecutarse en Render.)

Después:

1. Abre `https://tudominio.es/registro` y **crea tu cuenta** (te llegará el código: así compruebas que
   Resend funciona).
2. Vuelve a la **Shell** de Render y hazte administrador:
   ```bash
   npm run admin -- tu@email.com
   ```
3. Entra en `/admin`: revisa los productos, pon las fotos y los vídeos reales de los cursos.
4. Haz una **compra real pequeña** con tu tarjeta y comprueba: correo de confirmación, pedido en el panel
   y código de activación. Después puedes reembolsarla desde Stripe y cancelar el pedido en el panel.

**Comprobación de la IP** (límites de intentos): tras publicar, intenta entrar 11 veces seguidas con una
contraseña incorrecta. A la undécima debe salir «Demasiados intentos». Si no sale nunca, avisa: puede que
Render pase la IP del visitante en una cabecera distinta de las que lee `src/lib/limite.ts`.

## 6 bis. Copiar el catálogo de local a producción (`npm run catalogo:copiar`)

Si preparas el catálogo en local (en `valentia-dev`, desde tu `/admin`), este script deja **exactamente
el mismo** en producción: crea, actualiza y borra lo que haga falta, con los **mismos ids**.

**Qué copia** (6 colecciones): `Componente`, `Kit`, `KitComponente` (piezas de cada kit), `Curso`,
`Leccion` y `Ejercicio`. Las categorías, las reglas de compatibilidad y los ajustes de la tienda no están
en la base de datos: están en el código y llegan con cada despliegue.

**Qué NO toca nunca**: usuarios, direcciones, dispositivos, códigos de verificación, límites, pedidos,
pagos de Stripe, códigos de activación, lotes y el progreso de los cursos.

**Protección de los datos de clientes**: si algo que sobra en producción lo usa un pedido, un código de
activación, un lote, un alumno o su progreso, **no se borra** (sale con «!» y un aviso). Si eso chocara
con el catálogo nuevo (mismo nombre con otro id), el script se para sin escribir nada y te explica qué
revisar. Ten en cuenta que el catálogo cargado con `npm run db:catalogo` tiene **otros ids** que el de
local: la primera vez, el script borra esos documentos y crea los de local (es normal ver «borrar» y
«crear» en todo); solo da problemas si ya hay códigos de activación o alumnos en producción.

**Fotos**: las de `public/images/` ya van en git. Las que subiste desde el panel en local (`/subidas/…`)
el script las copia a `public/images/catalogo/` y en producción escribe esa ruta. Esas fotos tienen que
estar **en git y publicadas antes** de copiar: si no, el script se para y te dice cuáles faltan.
(Las fotos que subas desde el panel de producción van al Disk de Render, no a git.)

### Pasos

1. **Tu IP en `valentia-prod`**: Atlas → proyecto `valentia-prod` → **Network Access → Add IP Address →
   Add Current IP Address**, marca **«This entry is temporary»** (6 horas) → _Confirm_. Espera a que
   salga **Active**.
2. En tu ordenador, en la carpeta del proyecto (con tu `.env` apuntando a `valentia-dev`):

   ```powershell
   npm run catalogo:copiar -- --dry-run
   ```

   Te pide la **dirección de `valentia-prod`** (Atlas → `valentia-prod` → _Connect → Drivers_, con la
   contraseña y `/valentia` antes del `?`; ver §1). **Pégala con clic derecho o Ctrl+V: no se verá nada
   mientras la pegas** (es a propósito) y pulsa Intro. Después escribe `valentia-prod` para confirmar.
   La dirección solo se usa en memoria: no se guarda en ningún archivo.

3. Lee la **simulación**: una tabla con lo que se va a crear, actualizar, borrar y conservar en cada
   colección, y la lista detallada. Con `--dry-run` no se escribe nada.
4. Si fotos nuevas: el script las ha copiado a `public/images/catalogo/`. Haz commit, pull request, únelo a
   `main`, espera a que Render lo publique y vuelve al paso 2.
5. Para aplicar los cambios, ejecútalo **sin** `--dry-run`:

   ```powershell
   npm run catalogo:copiar
   ```

   Vuelve a enseñar la simulación y pregunta; escribe `si` para continuar. Antes de escribir guarda una
   **copia de seguridad** del catálogo de producción en `copias/catalogo-valentia-prod_<fecha>.json`
   (fuera de git) y luego escribe todo en **una sola transacción**: si algo falla, producción se queda
   como estaba. Al final enseña los totales de local y producción, comprueba que son iguales y muestra
   que los usuarios, pedidos y códigos no han cambiado.

6. **Vuelve a desplegar**: la portada, `/kits` y las fichas se generan al compilar, así que hasta el
   siguiente despliegue la web enseña el catálogo anterior. En Render: **Manual Deploy → Deploy latest
   commit**.
7. **Quita tu IP** de Network Access de `valentia-prod` (icono de papelera junto a ella), aunque sea
   temporal.

Si quieres deshacerlo, la copia de `copias/` tiene el catálogo de producción tal como estaba (formato EJSON,
como las de `npm run db:copia`).

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

## El día a día

- **Publicar un cambio** = unir su pull request a `main` en GitHub. Render lo publica en unos minutos
  (lo ves en la pestaña _Events_ del servicio).
- **Si una publicación falla**, la web sigue con la versión anterior; el motivo está en _Events → Deploy
  logs_. Las causas típicas: una variable que falta, Atlas sin la IP de Render o un cambio de esquema que
  Prisma no aplica para no perder datos.
- **Volver atrás**: _Events_ → una versión anterior → **Rollback**. Ojo: no deshace los cambios de la base
  de datos.
- **Cambios en el esquema**: el pull request lo indica («Cambios en la base de datos: sí»). Haz una copia
  (§7) antes de unirlo.
