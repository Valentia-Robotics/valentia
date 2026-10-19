/**
 * PREGUNTAS POR CONSOLA para los scripts (por ejemplo, npm run prod:admin en la Shell de Render).
 *   preguntar("Email: ")             → lo que escribes se ve
 *   preguntarOculto("Contraseña: ")  → no se ve nada mientras escribes o pegas; solo queda en memoria
 * Si la entrada no es una terminal (por ejemplo, en una prueba automática que envía las respuestas
 * por una tubería), se leen las líneas tal cual, sin mostrarlas.
 */
import { createInterface } from "node:readline";

/** Respuestas que llegan por tubería (sin terminal), una por línea */
let lineas: string[] | null = null;
let pendientes: ((linea: string) => void)[] = [];
let terminada = false;

function siguienteLinea(): Promise<string> {
  if (!lineas) {
    lineas = [];
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (linea) => {
      const esperando = pendientes.shift();
      if (esperando) esperando(linea);
      else lineas!.push(linea);
    });
    rl.on("close", () => {
      terminada = true;
      for (const esperando of pendientes) esperando("");
      pendientes = [];
    });
  }
  if (lineas.length > 0) return Promise.resolve(lineas.shift()!);
  if (terminada) return Promise.resolve("");
  return new Promise((resolver) => pendientes.push(resolver));
}

/** Pregunta normal: lo que escribes se ve */
export async function preguntar(texto: string): Promise<string> {
  process.stdout.write(texto);
  if (!process.stdin.isTTY) {
    const linea = await siguienteLinea();
    process.stdout.write("\n");
    return linea.trim();
  }
  return new Promise((resolver) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.once("line", (linea) => {
      rl.close();
      resolver(linea.trim());
    });
  });
}

/** Pregunta oculta: no se ve lo que escribes ni lo que pegas */
export async function preguntarOculto(texto: string): Promise<string> {
  process.stdout.write(texto);
  if (!process.stdin.isTTY) {
    const linea = await siguienteLinea();
    process.stdout.write("(oculta)\n");
    return linea;
  }
  return new Promise((resolver) => {
    let valor = "";
    const entrada = process.stdin;
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");
    const alPulsar = (trozo: string) => {
      for (const tecla of trozo) {
        if (tecla === "\u0003") {
          // Ctrl+C
          entrada.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        } else if (tecla === "\r" || tecla === "\n") {
          entrada.setRawMode(false);
          entrada.pause();
          entrada.off("data", alPulsar);
          process.stdout.write("(oculta)\n");
          resolver(valor);
          return;
        } else if (tecla === "\u007f" || tecla === "\b") {
          valor = valor.slice(0, -1);
        } else if (tecla >= " ") {
          valor += tecla;
        }
      }
    };
    entrada.on("data", alPulsar);
  });
}
