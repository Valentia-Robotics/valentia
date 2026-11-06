# Backend de Valentia

La API, separada de la web. Se publica en Render como un servicio propio. De momento la lógica sigue en
`frontend/src/lib`, así que el panel y la API siguen las mismas reglas; irá pasando aquí a medida que avance la separación.

```
npm run backend         # desde la raíz: en tu ordenador, puerto 4000
npm run backend:start   # desde la raíz: en Render
```

Necesita `DATABASE_URL` y `N8N_API_TOKEN` (al menos 32 caracteres). Sin token, la API queda cerrada. Genera uno con:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## POST /v1/guiones

Crea un guion en **borrador**, con origen IA, y aparece en `/admin/contenido` para revisarlo. Nunca llega a un editor
sin que el admin lo apruebe. No se puede elegir el estado ni el editor.

Cabecera: `Authorization: Bearer <N8N_API_TOKEN>`

```json
{
  "titulo": "El robot que aprendió a andar solo",
  "categoria": "Robótica",
  "plataforma": "VIDEO_CORTO",
  "duracionObjetivo": "45 segundos",
  "gancho": "¿Y si tu robot aprendiera a andar sin que lo programes?",
  "desarrollo": "Texto del guion…",
  "llamadaAccion": "Monta el tuyo con Valentia.",
  "notasVisuales": "Plano del robot andando.",
  "fechaLimite": "2030-01-15",
  "kit": "brazo-robotico"
}
```

| Campo              | Obligatorio | Valores                                                       |
| ------------------ | ----------- | ------------------------------------------------------------- |
| `titulo`           | Sí          | Hasta 140 caracteres                                          |
| `categoria`        | Sí          | Una de la lista de `/admin/contenido/categorias` (activas)    |
| `plataforma`       | Sí          | `VIDEO_CORTO`, `YOUTUBE_LARGO` u `OTRA`                       |
| `plataformaOtra`   | Con `OTRA`  | Hasta 60 caracteres                                           |
| `duracionObjetivo` | Sí          | Texto, hasta 40 caracteres                                    |
| `gancho`           | Sí          | Primeros 3 segundos, hasta 600 caracteres                     |
| `desarrollo`       | Sí          | Hasta 10.000 caracteres                                       |
| `llamadaAccion`    | Sí          | Hasta 600 caracteres                                          |
| `notasVisuales`    | Sí          | Hasta 5000 caracteres                                         |
| `fechaLimite`      | Sí          | `AAAA-MM-DD`                                                  |
| `kit`              | No          | Slug de un kit: `coche-seguidor-de-lineas`, `brazo-robotico`… |

| Respuesta | Significado                                                  |
| --------- | ------------------------------------------------------------ |
| `201`     | Creado: `{ id, estado, panel }`                              |
| `401`     | Token incorrecto                                             |
| `409`     | Ya hay un guion de IA con ese título de las últimas 24 horas |
| `413`     | Más de 64 KB                                                 |
| `422`     | No es válido: `errores` dice qué falla en cada campo         |
| `503`     | Falta configurar `N8N_API_TOKEN` en el servidor              |

## GET /health

Para el Health Check de Render. No pide token.
