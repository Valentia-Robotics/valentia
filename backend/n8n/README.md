# Conectar n8n con Valentia

n8n manda cada guion a la web. Llega a `/admin/contenido` como **Pendiente de aprobación**, sin editor y con la etiqueta
🤖 Automático. Desde ahí lo revisas, lo corriges si hace falta, lo apruebas y lo asignas a un editor, o lo descartas.

## 1. Crea la clave (una sola vez)

En tu ordenador:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sale una clave de 64 letras y números. No la pegues en ningún chat ni la subas a GitHub.

- **Render**: tu servicio → **Environment** → **Environment Variables** → **Add Environment Variable** → nombre
  `N8N_API_KEY`, valor la clave → **Save Changes**. Render vuelve a desplegar solo.
- **Tu ordenador** (para probar): en `frontend/.env` y en `backend/.env`, la línea `N8N_API_KEY="la-clave"`. Esos archivos
  no se suben a GitHub.

## 2. Comprueba que la web responde

```
npm run n8n:probar -- https://valentiarobotics.com
```

Comprueba la clave y que la entrada valida. No crea ningún guion. Si algo falla, te dice qué es.

## 3. Conecta n8n

1. En n8n, crea una credencial **Header Auth** llamada «Valentia»: **Name** `x-api-key`, **Value** la clave.
2. **Import from File** → `backend/n8n/flujo-valentia.json`. En «Ping Valentia» y «Enviar a Valentia», elige la credencial.
3. Pulsa **Test workflow**. En el panel aparece «Prueba desde n8n»: descártalo.
4. Sustituye el nodo «Guion (tu IA)» por tu flujo (cron, noticias, IA). Solo tiene que entregar el JSON de abajo.

## Las dos direcciones

| Llamada                                 | Respuesta                               |
| --------------------------------------- | --------------------------------------- |
| `GET /api/guiones/automaticos/ping`     | `200 { "ok": true }`: la clave es buena |
| `POST /api/guiones/automaticos`         | Crea el guion (abajo)                   |

Las dos llevan la cabecera `x-api-key`.

## El JSON

```json
{
  "titulo": "Robot que dobla ropa",
  "gancho": "¿Y si tu robot doblara la ropa?",
  "duracionSegundos": 50,
  "escenas": [
    { "orden": 1, "duracionSegundos": 10, "voz": "…", "visual": "…", "textoPantalla": "…" }
  ],
  "cierreCta": "…",
  "descripcionRedes": "…",
  "hashtags": ["robotica", "ia"],
  "nivel": "básico",
  "conexionValentia": "…",
  "datosAVerificar": ["…"],
  "relevancia": 8,
  "textoCompleto": "versión en texto plano de todo el guion",
  "fuente": { "titulo": "…", "url": "https://…", "medio": "xataka.com", "fecha": "2026-11-06T08:00:00Z" },
  "origen": "n8n",
  "modelo": "claude-sonnet-5-5",
  "generadoEn": "2026-11-06T08:01:00Z"
}
```

**Obligatorio:** `titulo`, `escenas` (al menos una, cada una con `voz` o `visual`) y `fuente.url` (empezando por `https://`).
Todo lo demás es opcional. También puedes mandar `categoria` (por nombre, por ejemplo `"Inteligencia Artificial"`; si no,
«Robótica») y `kit` (su slug, por ejemplo `"brazo-robotico"`).

Así se rellena el guion del panel: gancho → «Gancho»; `textoCompleto` (o las voces de las escenas) → «Desarrollo»;
`cierreCta` → «Llamada a la acción»; los visuales de las escenas → «Notas visuales». Si dura más de 3 minutos, es
«YouTube largo». La fecha límite es dentro de 7 días. Escenas, noticia y datos a verificar se ven aparte, en tablas.
El texto se limpia: no admite HTML.

## Qué hacer con cada respuesta

| Respuesta | Qué significa                                   | Qué debe hacer el flujo           |
| --------- | ----------------------------------------------- | --------------------------------- |
| `201`     | Creado: `{ "id": "…" }`                         | Nada                              |
| `409`     | Esa noticia ya dio un guion (aunque lo descartaras) | Darlo por bueno y seguir       |
| `400`     | `error` dice qué falta; `errores`, cada campo   | Corregir el JSON                  |
| `401`     | Falta `x-api-key` o no es la buena              | Revisar la credencial             |
| `413`     | Más de 200 KB                                   | Acortar                           |
| `429`     | Más de 30 peticiones en una hora                | Esperar una hora                  |
| `503`     | El servidor no tiene `N8N_API_KEY`              | Revisar el paso 1                 |

La misma noticia con otro `#ancla` o con parámetros `utm_` cuenta como la misma.

**Cada llamada queda apuntada** en el panel: **Contenido → Llamadas de n8n** (`/admin/contenido/llamadas`), con lo que
respondió la web y por qué. Si un guion no aparece, mira ahí primero. Un `429` quiere decir que ese guion **no se ha
creado** (pasó de 30 en una hora): el flujo tiene que volver a mandarlo más tarde.

Los guiones **nunca se borran solos**. «Descartar» los pasa a **Descartado** (filtro Estado → Descartados) y se pueden
recuperar con el botón **Recuperar**.

## Probar con curl

En tu ordenador, con `npm run dev` encendido (en Windows usa Git Bash):

```
curl -i -X POST http://localhost:3000/api/guiones/automaticos \
  -H "x-api-key: TU_CLAVE" -H "content-type: application/json" \
  -d '{"titulo":"Prueba","escenas":[{"voz":"Hola"}],"fuente":{"url":"https://ejemplo.com/noticia-1"}}'
```

En producción es lo mismo con `https://valentiarobotics.com`. La primera vez da `201`; repetirlo da `409`; sin
`-H "x-api-key: …"` da `401`. Después, descarta la prueba en el panel.
