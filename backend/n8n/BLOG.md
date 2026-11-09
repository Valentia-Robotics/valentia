# Blog automático con n8n

n8n escribe artículos y los manda a la web. La web los valida, les pasa unos filtros de calidad y:

- si la **publicación automática** está **apagada** (así empieza), quedan **pendientes** de que los apruebes en `/admin/blog`;
- si está **encendida** y pasan los filtros, entran **en cola** y se publican solos, como mucho N al día, a la hora elegida.

Al publicarse, la web actualiza el sitemap, avisa a Bing (IndexNow) y avisa a n8n (webhook) para que lo comparta.

## 1. Variables en Render

Tu servicio → **Environment** → **Environment Variables**:

| Variable              | Qué poner                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| `BLOG_API_KEY`        | Una clave nueva, distinta de la de guiones (comando de abajo)              |
| `N8N_PUBLISH_WEBHOOK` | Opcional: la dirección de tu nodo **Webhook** de n8n (empieza por https://) |

Clave segura (en la terminal del proyecto):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No la pegues en ningún chat. **Save Changes** y espera a **Live**.

## 2. Credencial en n8n

**Credentials → Add credential → Header Auth**: Name `x-api-key`, Value la clave. Llámala «Valentia blog».

## 3. Las tres llamadas

Todas con esa credencial (HTTP Request → Authentication: Generic Credential Type → Header Auth).

| Para qué                         | Método y dirección                                              |
| -------------------------------- | --------------------------------------------------------------- |
| Antes de escribir                | `GET https://valentiarobotics.com/api/blog/context`             |
| Mandar el artículo               | `POST https://valentiarobotics.com/api/blog/auto`               |
| Publicar la cola (**cada hora**) | `POST https://valentiarobotics.com/api/blog/publicar-cola`      |

### GET /api/blog/context

Devuelve los kits (nombre, dirección, descripción, palabras clave), los artículos de los últimos 30 días (para no
repetir tema), las categorías y las reglas. Pásaselo a tu IA junto con la noticia.

### POST /api/blog/auto

```json
{
  "title": "Cómo funciona un sensor de ultrasonidos",
  "content_markdown": "Texto en Markdown, con ## subtítulos…",
  "excerpt": "",
  "focus_keyword": "sensor de ultrasonidos",
  "meta_title": "",
  "meta_description": "",
  "category": "Electrónica",
  "tags": ["sensores", "arduino"],
  "related_kits": ["https://valentiarobotics.com/kits/coche-seguidor-de-lineas"],
  "image_url": "https://images.unsplash.com/photo-…",
  "image_alt": "Sensor de ultrasonidos sobre una placa",
  "image_credit": "Ana Pérez en Unsplash",
  "source_url": "https://…",
  "source_title": "…"
}
```

**Obligatorio:** `title` y `content_markdown`. Lo vacío se rellena solo: la dirección (slug), el extracto (el primer
párrafo), el título para Google (60 caracteres como mucho) y la descripción (155).

`category`: el nombre o el slug de una de estas: Robótica educativa, Noticias tech, Tutoriales, Proyectos maker,
Electrónica. `related_kits`: la dirección o el slug de cada kit.

Responde `201` con:

```json
{ "status": "queued", "id": "…", "url": "https://valentiarobotics.com/blog/…", "scheduledFor": "2026-11-10T09:00:00.000Z", "reasons": [] }
```

`status`: `queued` (saldrá sola a la hora de `scheduledFor`) o `pending` (espera al admin; `reasons` dice por qué).

### Filtros de calidad

Si alguno falla, el artículo queda `pending` con el motivo:

- al menos **600 palabras** y **2 subtítulos** (`##`);
- no repetir tema: la misma palabra clave, o un título muy parecido, que otro de los últimos 30 días;
- categoría de la lista y kits que existan;
- **imagen solo de bancos con licencia libre**: `images.unsplash.com`, `images.pexels.com` o `cdn.pixabay.com`, y con
  `image_alt`. Nunca la foto de la noticia: aunque se cite, suele infringir derechos de autor. Sin imagen también vale.

El texto se limpia: sin HTML peligroso, y los enlaces externos llevan `nofollow`.

### POST /api/blog/publicar-cola

Pon un **Schedule Trigger** cada hora que llame aquí. Si la publicación automática está encendida, ya es la hora elegida
y hoy no se ha llegado al máximo, publica el primero de la cola. Si no toca, responde por qué (`reason`). Así, aunque
Render se reinicie, no se pierde ninguna publicación.

## 4. Lo que recibe tu webhook al publicar

Si pusiste `N8N_PUBLISH_WEBHOOK`, la web le manda (POST):

```json
{ "title": "…", "url": "https://valentiarobotics.com/blog/…", "excerpt": "…", "imageUrl": "…", "tags": ["…"] }
```

Si el webhook falla, el artículo se publica igual; el fallo queda en `/admin/blog/llamadas`.

## Respuestas de error

| Código | Qué significa                                    |
| ------ | ------------------------------------------------ |
| `400`  | Falta `title` o `content_markdown`, o no es JSON |
| `401`  | Falta `x-api-key` o no es la buena               |
| `413`  | Más de 300 KB                                    |
| `429`  | Más de 60 llamadas en una hora                   |
| `503`  | El servidor no tiene `BLOG_API_KEY`              |

Todas las llamadas quedan en **`/admin/blog/llamadas`**.

## Probar con curl

En tu ordenador (Git Bash), con `BLOG_API_KEY` en `frontend/.env` y `npm run dev` encendido:

```
curl -s http://localhost:3000/api/blog/context -H "x-api-key: TU_CLAVE"

curl -s -X POST http://localhost:3000/api/blog/auto \
  -H "x-api-key: TU_CLAVE" -H "content-type: application/json" \
  -d '{"title":"Prueba de artículo desde n8n","content_markdown":"Hola.\n\n## Uno\n\nTexto.\n\n## Dos\n\nMás texto.","category":"Tutoriales"}'

curl -s -X POST http://localhost:3000/api/blog/publicar-cola -H "x-api-key: TU_CLAVE"
```

El de prueba queda `pending` (es corto): recházalo en `/admin/blog`. En producción, lo mismo con
`https://valentiarobotics.com`.
