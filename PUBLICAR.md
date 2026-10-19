# Publicar Valentia en Internet

Guía paso a paso para poner la web en tu dominio con **Vercel**. Se hace **una sola vez**; después,
cada pull request que se une a `main` se publica solo.

> Los nombres de los botones de cada servicio pueden cambiar un poco con el tiempo: si no encuentras
> uno exactamente, busca el más parecido.

## Qué vas a necesitar

| Servicio                                                           | Para qué                                    | Precio aproximado                          |
| ------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------ |
| Un **dominio** (`valentia.es`…)                                    | La dirección de la web                      | 10–15 €/año                                |
| [Vercel](https://vercel.com) (plan **Pro**)                        | Ejecuta la web                              | ~20 $/mes por persona del equipo en Vercel |
| [Neon](https://neon.tech)                                          | Base de datos PostgreSQL                    | Gratis para empezar                        |
| [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) | Fotos que subes desde el panel              | Gratis hasta 10 GB                         |
| [Resend](https://resend.com)                                       | Correos (códigos, confirmaciones de pedido) | Gratis hasta 3.000/mes                     |
| [Stripe](https://stripe.com)                                       | Cobrar con tarjeta                          | Comisión por venta                         |

El plan gratuito de Vercel (Hobby) **no sirve**: no permite webs comerciales ni repositorios de una
organización de GitHub.

Durante la guía irás apuntando claves. **Guárdalas en un gestor de contraseñas**, nunca en el
repositorio, en un correo ni en un chat del equipo.

## Cómo encaja todo

- **Producción**: la web de verdad (`https://tudominio.es`), con su base de datos, pagos reales y correos reales.
- **Vistas previas (Preview)**: cada pull request tiene su propia dirección de Vercel para probarlo
  antes de unirlo. Usan **otra base de datos** (de pruebas), **pago de prueba** y los correos no salen
  (se leen en los registros de Vercel). Así nada de lo que se pruebe toca a los clientes.
- Las **migraciones** de la base de datos se aplican solas al publicar (`scripts/migrar-al-publicar.mjs`).
  En las vistas previas solo si `BD_DE_PRUEBAS="si"`, para que un pull request sin unir nunca cambie la
  base de datos real.

---

## 1. Base de datos (Neon)

1. Crea una cuenta en neon.tech y un proyecto llamado `valentia`. Región: **AWS Europe Central 1
   (Frankfurt)** (la más cercana a España; Vercel usará la misma).
2. En **Connect** (o _Connection details_) copia **dos** direcciones de la rama `main`:
   - la que tiene **pooling activado** (lleva `-pooler` en el nombre) → será `DATABASE_URL`;
   - la que tiene **pooling desactivado** (conexión directa) → será `DATABASE_URL_DIRECTA`.
3. Crea una **rama** (_Branches → New branch_) llamada `preview` a partir de `main` y copia también
   sus dos direcciones. Es la base de datos de las vistas previas.
4. (Opcional) Para tener datos de muestra en las vistas previas, desde tu ordenador (PowerShell):
   ```powershell
   $env:DATABASE_URL="<dirección DIRECTA de la rama preview>"
   npx prisma migrate deploy
   npx prisma generate
   npx prisma db seed
   Remove-Item Env:DATABASE_URL
   npm run db:generate
   ```
   (El último paso deja tu copia local otra vez con SQLite.)
   **Nunca** hagas el seed en la base de datos de producción.

Neon guarda un historial de cambios para recuperar datos (_Restore_). Revisa cuántos días incluye tu
plan: es tu copia de seguridad.

## 2. Fotos (Cloudflare R2)

1. Crea una cuenta en Cloudflare → **R2** → _Create bucket_ → `valentia-fotos`.
2. Dirección pública del bucket (_Settings → Public access_):
   - lo mejor es un **dominio propio** como `fotos.tudominio.es` (necesita que el DNS de tu dominio esté
     en Cloudflare; es gratis y Cloudflare te guía);
   - la dirección `r2.dev` sirve para probar, pero no para la web de verdad.
3. _R2 → Manage API tokens → Create API token_ con permiso **Object Read & Write** solo para ese bucket.
   Copia el **Access Key ID** y el **Secret Access Key** (este último solo se ve una vez).
4. Apunta el **endpoint**: `https://<id-de-tu-cuenta>.r2.cloudflarestorage.com` (sale en la página del bucket).

Si ya subiste fotos en tu ordenador (carpeta `subidas/`), el README explica cómo pasarlas a la nube
(«Fotos en la nube»).

## 3. Correo (Resend)

1. Crea una cuenta en resend.com → **Domains → Add domain** → tu dominio.
2. Resend te da unos registros DNS (TXT y MX). Añádelos donde gestiones el DNS del dominio y espera a que
   salga **Verified** (minutos u horas).
3. **API Keys → Create API key** con permiso _Sending access_. Copia la clave (`re_…`).

**Sin este paso nadie puede registrarse ni iniciar sesión**, porque la web envía un código por correo.

## 4. Pagos (Stripe)

1. En stripe.com **activa la cuenta** (datos de la empresa y cuenta bancaria) para poder cobrar de verdad.
2. Con el **modo de prueba desactivado**, copia en _Desarrolladores → Claves de API_ la clave publicable
   (`pk_live_…`) y la secreta (`sk_live_…`).
3. _Desarrolladores → Webhooks → Añadir destino_:
   - dirección: `https://tudominio.es/api/pagos/stripe`
   - eventos: **`payment_intent.succeeded`** y **`payment_intent.canceled`**
   - copia el **secreto de firma** (`whsec_…`).

Las vistas previas no usan Stripe: tienen el pago de prueba.

## 5. Vercel

1. Crea una cuenta en vercel.com **con tu cuenta de GitHub** y elige el plan **Pro**.
2. **Add New → Project → Import Git Repository**. Si no aparece `Valentia-Robotics/valentia`, pulsa
   _Adjust GitHub App Permissions_ y da acceso a la organización **Valentia Robotics**.
3. Vercel detecta Next.js solo. **Antes de pulsar Deploy**, abre **Environment Variables** y añade las
   de la tabla de abajo, cada una en su entorno (_Production_ o _Preview_).
4. Pulsa **Deploy**. La primera vez tarda unos minutos.
5. En **Settings → Functions** elige la región **Frankfurt (fra1)**, la misma que la base de datos.
6. En **Settings → Deployment Protection** deja activada la protección de las vistas previas: así solo
   el equipo de Vercel puede abrirlas.

### Variables de entorno

| Variable                             | Production                                  | Preview                                   |
| ------------------------------------ | ------------------------------------------- | ----------------------------------------- |
| `AUTH_SECRET`                        | Una nueva: `npx auth secret`                | **Otra distinta**                         |
| `NEXT_PUBLIC_SITE_URL`               | `https://tudominio.es`                      | `https://tudominio.es`                    |
| `DATABASE_URL`                       | Neon `main`, con pooling                    | Neon `preview`, con pooling               |
| `DATABASE_URL_DIRECTA`               | Neon `main`, directa                        | Neon `preview`, directa                   |
| `BD_DE_PRUEBAS`                      | (no la pongas)                              | `si`                                      |
| `STRIPE_SECRET_KEY`                  | `sk_live_…`                                 | (no la pongas)                            |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…`                                 | (no la pongas)                            |
| `STRIPE_WEBHOOK_SECRET`              | `whsec_…`                                   | (no la pongas)                            |
| `STRIPE_PERMITIR_CLAVES_REALES`      | `si`                                        | (no la pongas)                            |
| `PERMITIR_PAGO_SIMULADO`             | (no la pongas)                              | `si`                                      |
| `CORREO_PROVEEDOR`                   | `resend`                                    | `consola`                                 |
| `RESEND_API_KEY`                     | `re_…`                                      | (no la pongas)                            |
| `CORREO_REMITENTE`                   | `Valentia <hola@tudominio.es>`              | (no la pongas)                            |
| `ALMACEN_PROVEEDOR`                  | `nube`                                      | `nube` (o nada: no se podrán subir fotos) |
| `ALMACEN_ENDPOINT`                   | `https://<cuenta>.r2.cloudflarestorage.com` | igual que en Production                   |
| `ALMACEN_REGION`                     | `auto`                                      | `auto`                                    |
| `ALMACEN_BUCKET`                     | `valentia-fotos`                            | igual (o un bucket de pruebas)            |
| `ALMACEN_CLAVE_ID`                   | Access Key ID de R2                         | igual que en Production                   |
| `ALMACEN_CLAVE_SECRETA`              | Secret Access Key de R2                     | igual que en Production                   |
| `ALMACEN_URL_PUBLICA`                | `https://fotos.tudominio.es`                | igual que en Production                   |

Las variables que empiezan por `NEXT_PUBLIC_` se graban al compilar: si cambias alguna, vuelve a
publicar (_Deployments → ⋯ → Redeploy_).

**Iniciar sesión en una vista previa**: los correos no salen; el código aparece en Vercel →
_Deployments_ → la vista previa → **Logs** (busca «CORREO»).

## 6. Tu dominio

1. En Vercel: **Settings → Domains → Add** → `tudominio.es` (y también `www.tudominio.es`, que
   redirigirá al principal).
2. Vercel te dice qué **registros DNS** crear (normalmente uno **A** y uno **CNAME**). Añádelos en la web
   donde compraste el dominio (o en Cloudflare, si llevas allí el DNS).
3. En unos minutos (a veces unas horas) aparece **Valid Configuration** y Vercel activa el **https** solo.

## 7. Primera puesta en marcha

1. Abre `https://tudominio.es`: la tienda saldrá **vacía** (es una base de datos nueva). Es normal.
2. **Regístrate** con tu email (te llegará el código: así compruebas que Resend funciona).
3. Hazte **administrador** desde tu ordenador (en Vercel no hay terminal). En PowerShell, dentro de la
   carpeta del proyecto, con la dirección **directa** de Neon `main`:
   ```powershell
   $env:DATABASE_URL_PUBLICADA="<dirección DIRECTA de Neon main>"
   npm run admin:web -- tu@email.com
   Remove-Item Env:DATABASE_URL_PUBLICADA
   ```
4. Entra en `/admin` y crea los **componentes, kits y cursos reales** (con sus fotos y vídeos).
5. Haz una **compra real pequeña** con tu tarjeta y comprueba: correo de confirmación, pedido en el
   panel y código de activación. Después puedes reembolsarla desde Stripe y cancelar el pedido.

Antes de abrir la web al público, repasa también `INFORME.md` §3 (datos de la empresa en
`src/config/tienda.ts` y revisión legal de las páginas `/legal`).

## El día a día

- **Publicar un cambio** = unir su pull request a `main` en GitHub. Vercel publica la nueva versión en
  un par de minutos (lo ves en _Deployments_ y también en el propio pull request).
- **Probar antes de unir**: en cada pull request, el bot de Vercel deja el enlace de su vista previa.
- **Si una publicación falla**, la web sigue con la versión anterior: en _Deployments_ verás el error.
  Las causas más típicas son una variable que falta o una migración que no se puede aplicar.
- **Volver atrás**: _Deployments_ → la versión buena → **Instant Rollback**. Ojo: esto devuelve el
  código, **no** deshace los cambios de la base de datos. Por eso las migraciones deben añadir cosas
  (columnas, tablas) en vez de borrarlas.
- **Cambios en la base de datos**: el README («Base de datos») explica cómo crear la migración de
  PostgreSQL además de la de SQLite. Los pull requests con migraciones lo indican en su descripción.
