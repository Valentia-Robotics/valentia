/**
 * PROBAR LA CONEXIÓN CON n8n sin abrir n8n.
 *
 *   npm run n8n:probar                                   → contra tu ordenador (localhost:3000)
 *   npm run n8n:probar -- https://valentiarobotics.com   → contra la web publicada
 *
 * Llama al ping (comprueba la clave) y manda un guion vacío, que la web rechaza con 400 sin guardar
 * nada: así se sabe que la entrada responde. NO crea ningún guion.
 * La clave se lee de N8N_API_KEY o de backend/.env, y nunca se muestra.
 */
import { existsSync, readFileSync } from "node:fs";

const web = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

function leerClave() {
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  const archivo = new URL("../.env", import.meta.url);
  if (!existsSync(archivo)) return "";
  const linea = readFileSync(archivo, "utf8").match(/^N8N_API_KEY=["']?([^"'\r\n]*)/m);
  return linea?.[1] ?? "";
}

const clave = leerClave();
if (!clave) {
  console.error("✗ Falta la clave: ponla en N8N_API_KEY o en backend/.env");
  process.exit(1);
}
const cabeceras = { "x-api-key": clave, "content-type": "application/json" };

const EXPLICACION = {
  401: "La clave no coincide con N8N_API_KEY del servidor.",
  404: "Esa web todavía no tiene la API (¿está desplegada esta versión?).",
  503: "El servidor no tiene N8N_API_KEY (en Render: Environment), o tiene menos de 32 caracteres.",
};

function fallar(paso, status, cuerpo) {
  console.error(`✗ ${paso}: respuesta ${status}. ${EXPLICACION[status] ?? JSON.stringify(cuerpo)}`);
  process.exit(1);
}

async function pedir(ruta, opciones) {
  try {
    const respuesta = await fetch(`${web}${ruta}`, { headers: cabeceras, ...opciones });
    return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => ({})) };
  } catch {
    console.error(`✗ No se puede conectar con ${web}. ¿Está encendida la web?`);
    process.exit(1);
  }
}

console.log(`Probando ${web}…`);

const ping = await pedir("/api/guiones/automaticos/ping");
if (ping.status !== 200) fallar("Ping", ping.status, ping.cuerpo);
console.log("✓ La clave es correcta");

const vacio = await pedir("/api/guiones/automaticos", { method: "POST", body: "{}" });
if (vacio.status !== 400) fallar("Validación", vacio.status, vacio.cuerpo);
console.log(`✓ La entrada responde y valida: «${vacio.cuerpo.error}» (no se ha guardado nada)`);
console.log("\nTodo listo: n8n puede conectarse.");
