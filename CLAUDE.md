# Valentia — contexto para Claude

Lee también `AGENTS.md` (lo genera Next.js): esta versión de Next.js (16) tiene cambios
importantes; consulta `node_modules/next/dist/docs/` antes de usar APIs que no conozcas.

## Estado del proyecto

> Actualizar esta sección al terminar cada fase.

**Fase actual: fase 2 terminada · siguiente: fase 3 (configurador).** No empezar una fase sin la aprobación del usuario.

### Terminado

- **Fase 1** (`841b2ac`): proyecto Next.js + TypeScript + Tailwind, sistema de diseño en `globals.css`,
  logo en SVG y PNG, favicon e iconos con el monograma "V", barra de navegación translúcida con contador
  de carrito (Zustand), menú móvil, pie de página, página `/diseno`, 404, CLAUDE.md y README.
- **Fase 2** (`2ce3987`): Prisma 7.10 + SQLite (`prisma.config.ts`, migración y seed validado con Zod),
  datos de prueba (18 componentes, 3 kits, 3 cursos con 14 lecciones), ilustraciones SVG de muestra,
  portada estilo Apple, `/kits` y `/kits/[slug]` (añadir al carrito y "Personalizar este kit").

### Pendiente

- **Fase 3 – Configurador** (estilo quiosco): categorías con icono, rejilla de tarjetas, detalle con
  cantidad, panel "Tu robot", reglas de compatibilidad como datos en `src/lib/compatibilidad`, empezar desde
  cero o desde un kit (`/configurador?kit=slug`), versión móvil. Incluye la página `/componentes`.
- **Fase 4 – Carrito y compra simulada**: página `/carrito`, checkout simulado preparado para Stripe,
  pedido en la BD, código de activación único y QR imprimible con el logo por cada kit.
- **Fase 5 – Login, activación y cursos**: Auth.js v5 (email y contraseña cifrada), `/activar?codigo=`,
  `/cursos`, lecciones con vídeo, tests y retos, progreso en la BD, rutas protegidas (`proxy.ts`).
  El seed debe crear un usuario de prueba y códigos sin usar, con las credenciales en el README.
- **Fase 6 – Repaso final de calidad**: accesibilidad, móvil, rendimiento, README completo, lint y build.

### Avisos abiertos

- `npm audit`: 5 vulnerabilidades "altas" en herramientas internas de ESLint (braces/micromatch, a través
  de eslint-config-next). Solo afectan al desarrollo; el "arreglo" de npm bajaría a Next 14. Revisar en la fase 6.
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
   (3) configurador · (4) carrito y compra simulada · (5) login, activación y cursos ·
   (6) repaso final de calidad.
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

- Next.js 16.4 (App Router, Turbopack) · React 19.3 · TypeScript 6.0 (typescript-eslint aún no admite la 7)
- Tailwind CSS 4.3 · Zustand 5 (carrito en localStorage) · lucide-react (iconos)
- ESLint 9 (eslint-config-next aún no admite ESLint 10) + Prettier 3 (con plugin de Tailwind)
- Prisma 7.10 estable (el tag "latest" de npm apunta a una 8.0 rc: no actualizar sin preguntar).
  - Config en `prisma.config.ts` (carga .env con dotenv; Prisma 7 no lo hace solo). Generador `prisma-client` → `src/generated/prisma` (ignorado en git; se crea en postinstall/build).
  - SQLite local en `prisma/dev.db` (`DATABASE_URL="file:./prisma/dev.db"`) con `@prisma/adapter-better-sqlite3`. Cliente único en `src/lib/db.ts` (import "server-only").
  - `migrate dev` NO genera el cliente ni ejecuta el seed en Prisma 7: usar `npm run db:generate` / `npm run db:seed`.
  - Para PostgreSQL: provider + adaptador (`@prisma/adapter-pg`) en db.ts y seed.ts + migraciones nuevas (ver README).
  - Seed (`prisma/seed.ts`, con tsx) valida `data/*.json` con Zod (`src/lib/validaciones/catalogo.ts`, mensajes en español). En los JSON los precios van en euros; en la BD, en céntimos.
- Zod 4 · Próximas fases: Auth.js v5 beta (next-auth@beta) con email y contraseña cifrada (bcryptjs), qrcode.
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
src/components/        ui/, layout/, marca/, tienda/, configurador/, cursos/
src/config/            marca.ts, categorias.ts
src/lib/               db.ts, catalogo.ts (consultas), validaciones/, utils.ts (+ auth, compatibilidad/, pagos/ en próximas fases)
src/generated/prisma/  cliente de Prisma generado (no editar, no se sube a git)
data/                  componentes.json, kits.json, cursos.json (fuente de los datos de prueba)
prisma/                schema.prisma, migrations/, seed.ts, dev.db
src/store/             carrito.ts
src/types/
```
