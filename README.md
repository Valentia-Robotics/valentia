# Valentia

Web de **Valentia**: kits de robótica y componentes, con cursos que se desbloquean con el QR de cada caja.

> Estado: **fase 1 de 6** (base, sistema de diseño, logo y navegación). Este README se completará en la fase 6.

## Cómo arrancar el proyecto

Necesitas tener instalado [Node.js](https://nodejs.org) 22 o superior.

```bash
npm install        # descarga las librerías (solo la primera vez)
npm run dev        # arranca la web en modo desarrollo
```

Abre **http://localhost:3000** en el navegador. Cada vez que guardes un archivo, la página se actualiza sola.
Para pararla, pulsa `Ctrl + C` en la terminal.

Si es la primera vez, copia `.env.example` como `.env` y rellena los valores.

### Otros comandos

| Comando          | Para qué sirve                                               |
| ---------------- | ------------------------------------------------------------ |
| `npm run build`  | Prepara la versión final y optimizada de la web              |
| `npm run start`  | Arranca la versión final (después de `build`)                |
| `npm run lint`   | Revisa el código en busca de errores                         |
| `npm run format` | Ordena y da formato a todo el código                         |
| `npm run marca`  | Regenera el favicon, los iconos y las versiones PNG del logo |

## Qué hay en cada carpeta

| Carpeta                                             | Contenido                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| `imagenes/`                                         | Tus originales (logo.png). No se modifican nunca.                 |
| `public/images/brand/`                              | Logo para la web (SVG y PNG) e iconos                             |
| `public/images/componentes/`, `public/images/kits/` | Fotos de productos (fase 2)                                       |
| `scripts/`                                          | Programas de ayuda (generar iconos a partir del logo)             |
| `src/app/`                                          | Las páginas de la web. Cada carpeta es una dirección (`/kits`, …) |
| `src/app/globals.css`                               | **Sistema de diseño**: colores, tipografías, radios y sombras     |
| `src/components/`                                   | Piezas reutilizables: botones, barra de navegación, pie, logo…    |
| `src/config/marca.ts`                               | Nombre, lema y enlaces del menú y del pie                         |
| `src/store/`                                        | El carrito (se guarda en el navegador)                            |
| `src/lib/`, `src/types/`                            | Utilidades y tipos de datos                                       |

## Cómo cambiar…

### Los colores

Abre `src/app/globals.css` y cambia los valores dentro de `@theme`. Por ejemplo, para otro azul de acento,
cambia `--color-acento`. Puedes ver todos los colores en **http://localhost:3000/diseno**.

### El logo

1. Sustituye `imagenes/logo.png` por tu nuevo logo.
2. Ejecuta `npm run marca` (regenera las copias PNG, el favicon y los iconos).
3. La web usa `public/images/brand/logo.svg` y `logo-blanco.svg` (versión vectorial). Si tu nuevo logo es
   distinto, sustitúyelos también, o cambia en `src/config/marca.ts` las rutas a `logo-negro.png` y `logo-blanco.png`.

### El icono de la pestaña (favicon)

Edita `public/images/brand/monograma.svg` y ejecuta `npm run marca`.

### Los textos del menú y del pie

En `src/config/marca.ts`.

_Productos, imágenes de productos y vídeos de los cursos: se explicará en las próximas fases._
