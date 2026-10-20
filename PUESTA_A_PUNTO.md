# Valentia — Puesta a punto final

Trabaja de forma AUTÓNOMA, sin hacerme preguntas, hasta dejar la web lista. Si tienes que decidir algo, elige la opción más segura y anótala en el informe final. Sigue las reglas de Git de CLAUDE.md (rama propia, commits por bloque, pull request al final; no lo unas tú). Registra el progreso en CLAUDE.md para poder retomarlo si la sesión se corta.

Contexto:
- La web está publicada en Render (plan Starter, con Shell y Disk), región Frankfurt, desplegando la rama main.
- Base de datos: MongoDB Atlas. En local, mi .env apunta a valentia-dev. Producción usa valentia-prod, configurada solo en Render.
- NUNCA te conectes a valentia-prod desde mi ordenador, ni me pidas su cadena de conexión o contraseñas. No modifiques mi .env.

## 1. Depuración completa
- Revisa el estado del proyecto (apóyate en graphify si está disponible).
- Ejecuta lint, comprobación de tipos, build y todos los tests (unitarios y Playwright). Corrige todo lo que falle.
- Arranca la build de producción en local (npm run build y npm start) y recorre con Playwright todas las páginas: portada, kits, ficha de kit, componentes, configurador, carrito, checkout de prueba, registro, verificación por correo (bandeja /dev/correos), login, activación de código, mis cursos, lección con vídeo, test, mis dispositivos, panel de administración y páginas legales. Corrige cualquier error de consola, de servidor, enlace roto, imagen que no carga o página que se rompa.
- Revisa la vista móvil de las páginas principales.
- Las páginas que dependen de datos deben mostrar un estado vacío amable y nunca romperse si falta algo.
- /api/health debe responder siempre en menos de 5 segundos, sin quedar bloqueado por ningún middleware.
- Corrige el warning de Turbopack en src/lib/almacenamiento/local.ts ("Dynamic filesystem access causes tracing of the whole project").
- Ejecuta npm audit y corrige lo que se pueda sin romper nada.

## 2. Que la web publicada no aparezca vacía
- Exporta desde valentia-dev el catálogo completo que ve el cliente: componentes, categorías, kits con sus componentes, reglas de compatibilidad si están en base de datos, cursos, lecciones y ejercicios. Guárdalo en ficheros JSON del proyecto (por ejemplo data/catalogo/), conservando los ids para que las relaciones se mantengan.
- NO exportes usuarios, sesiones, cuentas, dispositivos, códigos de verificación, pedidos, direcciones, códigos de activación ni progreso. Son datos de prueba.
- Las imágenes que use el catálogo y que estén en la carpeta local de uploads (fuera de git) cópialas al repositorio dentro de public/ y ajusta sus rutas en el JSON exportado.
- Crea un script "npm run seed:prod" que cargue ese catálogo de forma idempotente: crea lo que no existe y actualiza lo que ha cambiado, pero NUNCA borra nada ni toca usuarios, pedidos o códigos. Si ya existe en producción algo que no está en el JSON (por ejemplo, algo creado desde el panel), lo deja intacto.
- Prepara un comando de pre-despliegue para Render (por ejemplo "npm run predeploy:prod") que ejecute "prisma db push" sin pérdida de datos (si un cambio implicara perder datos, que falle con un mensaje claro) y después "seed:prod".
- Prueba todo contra una base de datos local nueva dentro de valentia-dev (por ejemplo valentia_prueba_seed): ejecuta el pre-despliegue dos veces seguidas y comprueba que no duplica nada y que la web muestra el catálogo completo. Borra esa base de prueba al terminar.
- Crea un script "npm run prod:admin" para ejecutar desde la Shell de Render: pide por consola un email y una contraseña (oculta, dos veces), crea ese usuario como ADMIN con el email ya verificado y la contraseña cifrada igual que en el registro, o convierte en ADMIN un usuario existente sin tocar su contraseña.

## 3. Documentación
- Actualiza DESPLIEGUE.md: qué poner en Render en "Pre-Deploy Command" y en "Health Check Path", cómo crear mi usuario administrador desde la Shell, y cómo volver a exportar el catálogo cuando cambie en local.
- Actualiza README.md, CLAUDE.md e INFORME.md. En INFORME.md incluye lo que has corregido, las decisiones que tomaste y una lista de lo que tengo que hacer yo, en orden.

## 4. Al terminar
1. Lint, build y todos los tests en verde.
2. Actualiza graphify (/graphify . o su comando equivalente).
3. Haz el commit final, push y abre el pull request hacia main.
4. Dime el enlace del pull request y los pasos exactos que debo hacer en Render después de unirlo.