# Valentia

Web de **Valentia**: kits de robótica y componentes, con cursos que se desbloquean con el QR de cada caja.

> Estado: **preparada para el lanzamiento** (fase de lanzamiento terminada, ver `INFORME.md`).
> Funciona entera en tu ordenador con **pagos de prueba**. Para publicarla hay que poner claves de
> Stripe, una base de datos PostgreSQL, un proveedor de correo y revisar los textos legales: sigue la
> lista [Antes de publicar la web](#antes-de-publicar-la-web).

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

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 (SQLite en local,
PostgreSQL en producción) · Auth.js v5 (email y contraseña, verificación con código por email) ·
Stripe (Payment Element) · three.js (robot 3D) · Zustand (carrito y cookies en el navegador) ·
Zod (validación) · qrcode · lucide-react (iconos) · Vitest y Playwright (pruebas) · ESLint + Prettier.

## Cómo arrancar el proyecto

Necesitas tener instalado [Node.js](https://nodejs.org) 22 o superior (y Google Chrome para las pruebas).

```bash
npm install        # descarga las librerías (solo la primera vez)
npm run setup      # crea la base de datos y carga los datos de prueba (solo la primera vez)
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

## Cómo trabajamos

El código vive en GitHub, en el repositorio privado **Valentia-Robotics/valentia**. La regla de oro:

> **`main` es la rama estable** (lo que se publica). **Nadie trabaja directamente en ella.**
> Cada tarea se hace en su propia rama y llega a `main` mediante un **pull request** que revisa otra persona.

Una **rama** es una copia del proyecto donde puedes hacer cambios sin molestar a nadie. Un **pull request**
(PR) es la petición de «por favor, une mis cambios a `main`»: ahí el equipo los ve, comenta y aprueba.

### Antes de empezar (solo la primera vez)

1. Instala [Git](https://git-scm.com), [Node.js](https://nodejs.org) 22 o superior y
   [GitHub CLI](https://cli.github.com). Inicia sesión con `gh auth login`.
2. Acepta la invitación al repositorio (te llega por email o en github.com).
3. Descarga el proyecto, crea tu `.env`, instala y prepara la base de datos:

```bash
gh repo clone Valentia-Robotics/valentia
cd valentia
cp .env.example .env     # en Windows (PowerShell): copy .env.example .env
npm install              # instala las librerías y activa las protecciones de git
npm run setup            # crea la base de datos con datos de prueba
npm run dev              # abre http://localhost:3000
```

En `.env` genera tu propia clave con `npx auth secret`. **Los secretos (claves de Stripe, Resend…) se piden
por privado a quien los tenga, nunca se escriben en el repositorio, en un issue ni en un pull request.**
El archivo `.env` está en `.gitignore`, así que git nunca lo sube.

### El ciclo de una tarea, con un ejemplo

Ana quiere añadir filtros al configurador. Su usuario de GitHub es `ana` (puedes ver el tuyo con
`gh api user --jq .login`). Los nombres de rama son `usuario/descripcion-corta`, en minúsculas y con guiones.

```bash
# 1. Traer lo último de main y crear la rama de la tarea
git switch main
git pull
git switch -c ana/filtros-configurador

# 2. Trabajar… y guardar cada avance con un commit (mensaje claro en español)
git add .
git commit -m "Configurador: filtro por categoría"

# 3. Subir la rama a GitHub (la primera vez con -u; después basta con "git push")
git push -u origin ana/filtros-configurador

# 4. Antes de terminar: traer los cambios que otros hayan unido a main y comprobar que todo va bien
git fetch
git merge origin/main
npm run lint && npm run build && npm test

# 5. Abrir el pull request (rellena la plantilla: qué cambia, cómo probarlo, base de datos, capturas)
gh pr create --base main
```

6. **Revisión**: otra persona del equipo revisa el PR y lo aprueba (o pide cambios: haces más commits en la
   misma rama y `git push`; el PR se actualiza solo).
7. **Unir (merge)**: con la aprobación, se pulsa **«Merge pull request»** en GitHub.
8. **Borrar la rama**: pulsa **«Delete branch»** en el PR y, en tu ordenador:
   `git switch main`, `git pull` y `git branch -d ana/filtros-configurador`.

Si usas **VS Code**, al hacer un commit desde el panel de control de código fuente los cambios se suben solos
a tu rama (`git.postCommitCommand: "sync"` en `.vscode/settings.json`). La primera vez en una rama nueva te
preguntará si quieres publicarla: di que sí.

### Cómo revisar y aprobar un pull request en la web de GitHub

1. Abre el repositorio en github.com → pestaña **Pull requests** → elige el PR.
2. Lee la descripción y sigue los pasos de «Cómo probarlo». Para probarlo en tu ordenador:
   `gh pr checkout <número>` y `npm run dev` (si dice que hay migraciones: `npx prisma migrate dev`).
3. En la pestaña **Files changed** verás cada cambio. Para comentar una línea, pasa el ratón por encima y pulsa
   el **+** azul.
4. Pulsa **Review changes** (arriba a la derecha) y elige:
   **Comment** (solo comentar), **Approve** (aprobar) o **Request changes** (pedir cambios). Luego **Submit review**.
5. Con la aprobación, cualquiera del equipo puede pulsar **Merge pull request** → **Confirm merge** y después
   **Delete branch**. Nadie une su propio PR sin que otra persona lo haya aprobado.

### Qué hacer si aparecen conflictos

Un **conflicto** ocurre cuando tú y otra persona habéis cambiado las mismas líneas. No pasa nada, se arregla así:

1. En tu rama: `git fetch` y `git merge origin/main`. Git te dirá qué archivos tienen conflicto.
2. Abre cada archivo (VS Code los marca en rojo). Verás bloques así:

   ```
   <<<<<<< HEAD
   tu versión
   =======
   la versión que ya está en main
   >>>>>>> origin/main
   ```

   Deja el código correcto (a veces una parte, a veces las dos combinadas) y borra las marcas
   `<<<<<<<`, `=======` y `>>>>>>>`. VS Code ofrece los botones «Accept Current / Incoming / Both».

3. Comprueba que todo funciona (`npm run lint`, `npm run build`, `npm test`), y termina con
   `git add .`, `git commit` y `git push`.
4. Si no sabes qué versión es la buena, **pregunta a quien hizo el otro cambio** antes de decidir.
   Si te lías, `git merge --abort` deja la rama como estaba antes del merge.

GitHub también avisa en el PR («This branch has conflicts») y, para conflictos sencillos, deja resolverlos en la
web con **Resolve conflicts**.

### Protección de main (hooks de git)

GitHub no deja proteger ramas en repositorios privados con el plan gratuito, así que lo hacemos en cada ordenador
con [husky](https://typicode.github.io/husky/): al hacer `npm install` se activan dos comprobaciones
(carpeta `.husky/`). **pre-commit** impide hacer commits estando en `main` y **pre-push** impide subir a `main`.
`git pull` en `main` y los merges que se hacen desde GitHub siguen funcionando con normalidad.

Si alguna vez haces cambios en `main` sin querer, no los pierdas: `git switch -c tu-usuario/descripcion` crea una
rama nueva y se lleva tus cambios con ella.

**Solo en una emergencia** (y avisando al equipo) se pueden saltar con `--no-verify`
(`git commit --no-verify`, `git push --no-verify`).

### Si trabajas con Claude Code

No tienes que hacer nada especial: `CLAUDE.md` («Git y GitHub») ya le dice que cree la rama, haga commits y
push, compruebe lint, build y tests, y abra el pull request sin unirlo él mismo.

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
del servidor `CORREO_PROVEEDOR="resend"`, `RESEND_API_KEY="re_…"` y `CORREO_REMITENTE="Valentia <hola@tudominio.es>"`.
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
| **Códigos**     | Generar códigos en lote, imprimir sus tarjetas QR, desactivarlos                                                                                                                                                     |
| **Usuarios**    | Lista con buscador: email, registro, cursos activados y pedidos                                                                                                                                                      |

Algunas reglas: un pedido solo pasa a «Pagado» con el pago confirmado (nunca desde el panel). Si
cancelas un pedido ya cobrado con Stripe, **devuelve el dinero desde el panel de Stripe** (la ficha del
pedido tiene un enlace). Ocultar un componente o un kit lo quita de la tienda sin borrarlo. Borrar algo
con dependencias se bloquea y se propone ocultarlo. Las fotos se reducen y se convierten a WebP solas.

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

`npm run test:e2e` usa el **Chrome** instalado, **su propia base de datos** (`prisma/e2e.db`, que crea de
cero cada vez) y **su propia copia** de la web compilada en http://localhost:3100, así que no toca tus
datos ni tu `npm run dev`. Recorre: registro → código por correo → configurador → carrito → pago de
prueba → activación del código → vídeo → test; y comprueba la seguridad básica, el SEO y la zona de envío.
Tarda un par de minutos (compila la web).

## Otros comandos

| Comando                         | Para qué sirve                                                             |
| ------------------------------- | -------------------------------------------------------------------------- |
| `npm run build`                 | Prepara la versión final y optimizada de la web                            |
| `npm run start`                 | Arranca la versión final (después de `build`)                              |
| `npm run lint`                  | Revisa el código en busca de errores                                       |
| `npm run format`                | Ordena y da formato a todo el código                                       |
| `npm run marca`                 | Regenera el favicon, los iconos y las versiones PNG del logo               |
| `npm run admin`                 | Da o quita el rol de administrador                                         |
| `npm run db:seed`               | Carga `data/*.json`, solo si la base de datos está vacía                   |
| `npm run db:reset`              | **Lo borra todo** y crea la base de datos de nuevo con los datos iniciales |
| `npm run db:migrate`            | Aplica cambios de `prisma/schema.prisma` a la base de datos                |
| `npm run db:studio`             | Abre un panel en el navegador para ver y editar la base de datos           |
| `npm run db:postgres`           | Actualiza la copia del esquema para PostgreSQL (también lo hace `build`)   |
| `npm run fotos:nube`            | Sube a la nube las fotos de `subidas/` y actualiza sus direcciones         |
| `npm test` / `npm run test:e2e` | Pruebas automáticas (ver arriba)                                           |

## Qué hay en cada carpeta

| Carpeta               | Contenido                                                                            |
| --------------------- | ------------------------------------------------------------------------------------ |
| `imagenes/`           | Tus originales (logo.png). No se modifican nunca.                                    |
| `public/images/`      | Logo, iconos e ilustraciones de muestra                                              |
| `data/`               | **Datos iniciales**: componentes, kits y cursos (JSON)                               |
| `prisma/`             | Esquema, migraciones (SQLite), seed y `dev.db`; `prisma/postgresql/` para producción |
| `scripts/`            | Programas de ayuda (marca, admin, esquema PostgreSQL, fotos a la nube, pruebas)      |
| `e2e/`                | Pruebas con navegador (Playwright)                                                   |
| `subidas/`            | Fotos subidas desde el panel (no se sube a git)                                      |
| `.husky/`             | Hooks de git que protegen `main` (ver «Cómo trabajamos»)                             |
| `.github/`            | Plantilla de los pull requests                                                       |
| `src/app/`            | Las páginas. Cada carpeta es una dirección (`/kits`, `/checkout`…)                   |
| `src/app/globals.css` | **Sistema de diseño**: colores, tipografías, radios y sombras                        |
| `src/components/`     | Piezas reutilizables (portada 3D, compra, cursos, panel, legal…)                     |
| `src/config/`         | `tienda.ts` (negocio), `marca.ts` (menús), `estadosPedido.ts`, `categorias.ts`       |
| `src/lib/`            | Base de datos, pedidos, precios, pagos (Stripe), correo, límites, almacenamiento…    |
| `src/store/`          | Carrito, robot del configurador y consentimiento de cookies (en el navegador)        |

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

En local se usa **SQLite**: un único archivo, `prisma/dev.db` (no se sube a git). Tablas principales:
catálogo (`Componente`, `Kit`, `Curso`, `Leccion`, `Ejercicio`), compras (`Pedido`, `LineaPedido`,
`Direccion`, `CodigoActivacion`, `LoteCodigos`, `EventoStripe`), cuentas (`Usuario`, `CursoUsuario`,
`ProgresoLeccion`, `ProgresoEjercicio`, `VideoVisto`, `ResultadoTest`) y seguridad (`Verificacion`,
`EnvioCodigo`, `DispositivoConfianza`, `LimiteIntento`). Las contraseñas se guardan cifradas con bcrypt.

### Pasar a PostgreSQL (producción)

El código está listo: **basta con cambiar la configuración**.

1. Crea una base de datos PostgreSQL (por ejemplo en Neon, Supabase, Railway o tu hosting).
2. Pon su dirección en `DATABASE_URL` del servidor: `postgresql://usuario:contraseña@host:5432/valentia`.
3. Ejecuta `npx prisma migrate deploy`: con una URL de PostgreSQL, Prisma usa automáticamente
   `prisma/postgresql/schema.prisma` y sus migraciones (la inicial ya está creada).
4. `npm run build` y `npm start` (o el despliegue de tu hosting). El adaptador de PostgreSQL se elige
   solo (`src/lib/adaptadorBD.ts`). No ejecutes `npm run db:seed` en producción.

Cuando cambies el esquema en el futuro: edita **solo** `prisma/schema.prisma`, crea la migración de
SQLite con `npm run db:migrate` y, con una base de datos PostgreSQL de pruebas en `DATABASE_URL`,
ejecuta `npm run db:postgres && npx prisma migrate dev` para crear la de PostgreSQL. Sube las dos a git.

### Fotos en la nube (producción)

El disco de muchos servidores se borra en cada despliegue, así que en producción las fotos del panel
deben ir a un almacén compatible con S3 (**Cloudflare R2**, Amazon S3, Backblaze B2…):

1. Crea un _bucket_ con acceso público de lectura y una clave con permiso solo para él.
2. En `.env` del servidor: `ALMACEN_PROVEEDOR="nube"` y las variables `ALMACEN_ENDPOINT`,
   `ALMACEN_REGION`, `ALMACEN_BUCKET`, `ALMACEN_CLAVE_ID`, `ALMACEN_CLAVE_SECRETA` y
   `ALMACEN_URL_PUBLICA` (explicadas en `.env.example`).
3. Si ya tienes fotos en `subidas/`: `npm run fotos:nube` (prueba) y `npm run fotos:nube -- --hacer`.

## Antes de publicar la web

La lista completa, explicada paso a paso, está en **`INFORME.md`**. En resumen:

1. **Datos de la empresa** en `src/config/tienda.ts` y **revisión legal** de las páginas `/legal/…`.
2. **Base de datos PostgreSQL** (ver arriba) y copias de seguridad.
3. **Variables del servidor**: `AUTH_SECRET` nueva, `NEXT_PUBLIC_SITE_URL` con `https://`, `DATABASE_URL`.
4. **Stripe**: claves reales, `STRIPE_PERMITIR_CLAVES_REALES="si"` y webhook en el panel de Stripe.
5. **Correo**: Resend con tu dominio verificado (sin esto nadie puede registrarse).
6. **Fotos en la nube** (ver arriba).
7. **Administrador**: regístrate en la web publicada y ejecuta allí `npm run admin -- tu@email.com`.
8. **Datos de prueba**: no cargues el seed; crea los productos reales desde el panel.
9. **Vídeos** de los cursos (ahora «PENDIENTE») desde `/admin/cursos`.

## Actualizar las librerías

`npm outdated` muestra qué librerías tienen versiones nuevas. Las actualizaciones pequeñas suelen ser
seguras: después ejecuta `npm run lint`, `npm test`, `npm run build` y `npm run test:e2e`. **No** actualices
todavía a Prisma 8, ESLint 10 ni TypeScript 7. `npm audit` avisa de problemas en ESLint (herramienta de
desarrollo, no afecta a la web): su «arreglo» bajaría a Next 14, así que hay que esperar a la corrección.
