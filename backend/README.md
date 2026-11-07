# Backend de Valentia

La API, separada de la web. **Todavía no se publica:** para pagar un solo servicio en Render, n8n llama a la web
(`https://valentiarobotics.com/api/guiones/automaticos`). Este servidor tiene **las mismas rutas y el mismo código**
(`frontend/src/lib/contenido/guionesAutomaticos.ts`): si algún día la web pasa a Vercel, solo cambia la dirección.

```
npm run backend         # desde la raíz: en tu ordenador, puerto 4000
npm run backend:start   # desde la raíz: en Render
```

Necesitan `DATABASE_URL` y `N8N_API_KEY` (al menos 32 caracteres; sin ella la API responde 503).

## Rutas

| Ruta                                    | Para qué                                              |
| --------------------------------------- | ----------------------------------------------------- |
| `POST /api/guiones/automaticos`         | n8n crea un guion pendiente de aprobación             |
| `GET /api/guiones/automaticos/ping`     | Comprueba la clave: `{ "ok": true }`                  |
| `GET /health`                           | Health Check de Render (sin clave ni base de datos)   |

Cabecera `x-api-key: <N8N_API_KEY>`. Formato del JSON, respuestas y pasos para conectar n8n:
**`backend/n8n/README.md`**.
