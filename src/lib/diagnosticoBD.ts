/**
 * DIAGNÓSTICO DE LA CONEXIÓN CON MONGODB
 * Traduce los errores de conexión (de Prisma o del driver de MongoDB) a una explicación en español
 * y quita cualquier contraseña de los mensajes antes de escribirlos en los logs.
 *
 * Lo usan /api/health?db=1 y "npm run db:check" (scripts/comprobar-bd.ts), así que no importa
 * nada exclusivo de Next.js.
 */

/** Tipo de problema, para mostrarlo en la respuesta sin dar detalles internos */
export type MotivoErrorBD =
  | "sin-direccion"
  | "direccion-mal-formada"
  | "credenciales"
  | "sin-permisos"
  | "host-no-encontrado"
  | "conexion-rechazada"
  | "tiempo-agotado"
  | "desconocido";

export interface ErrorBDExplicado {
  motivo: MotivoErrorBD;
  /** Qué pasa y qué revisar, en lenguaje sencillo */
  explicacion: string;
  /** Mensaje original, sin contraseñas (solo para los logs) */
  detalle: string;
}

/** Cambia "mongodb+srv://usuario:clave@host" por "mongodb+srv://usuario:***@host" en cualquier texto */
export function ocultarSecretos(texto: string): string {
  return texto.replace(/(mongodb(?:\+srv)?:\/\/)([^:@/\s]*)(?::[^@\s]*)?@/gi, "$1$2:***@");
}

/** Error de "tiempo agotado" propio (lo lanza conTiempoLimite) */
export class TiempoAgotadoError extends Error {
  constructor(ms: number) {
    super(`Sin respuesta de la base de datos en ${ms} ms`);
    this.name = "TiempoAgotadoError";
  }
}

/** Espera una promesa como mucho "ms" milisegundos (si tarda más, lanza TiempoAgotadoError) */
export async function conTiempoLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new TiempoAgotadoError(ms)), ms);
  });
  try {
    return await Promise.race([promesa, limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

/** Mensaje y nombre del error, juntos (los de Prisma guardan el motivo real en el mensaje) */
function textoDelError(error: unknown): string {
  if (error instanceof Error) {
    const causa =
      error.cause instanceof Error && error.cause.message !== error.message
        ? ` (${error.cause.message})`
        : "";
    return `${error.name}: ${error.message}${causa}`.trim();
  }
  return String(error);
}

/** Comprueba la forma de DATABASE_URL sin conectarse. null si parece correcta. */
export function revisarDireccion(url: string | undefined): ErrorBDExplicado | null {
  if (!url?.trim()) {
    return {
      motivo: "sin-direccion",
      explicacion: "Falta la variable DATABASE_URL (en Render: pestaña Environment).",
      detalle: "DATABASE_URL vacía",
    };
  }
  const malFormada = (explicacion: string): ErrorBDExplicado => ({
    motivo: "direccion-mal-formada",
    explicacion,
    detalle: ocultarSecretos(url),
  });
  if (/^\s|\s$/.test(url) || /^["']|["']$/.test(url)) {
    return malFormada("DATABASE_URL tiene espacios o comillas al principio o al final: quítalos.");
  }
  if (!/^mongodb(\+srv)?:\/\//.test(url)) {
    return malFormada(
      "DATABASE_URL debe empezar por mongodb+srv:// (la de Atlas → Connect → Drivers).",
    );
  }
  if (url.includes("<") || url.includes(">")) {
    return malFormada(
      "DATABASE_URL todavía tiene <db_password> (u otro <…>): pon la contraseña real.",
    );
  }
  // usuario:contraseña@host/basededatos?opciones
  const partes = /^mongodb(?:\+srv)?:\/\/(?:([^@/]*)@)?([^/?@]+)(\/[^?]*)?(\?.*)?$/.exec(url);
  if (!partes) {
    return malFormada(
      "DATABASE_URL no tiene el formato esperado. Si la contraseña lleva / ? # @ : o %, tiene que ir codificada (por ejemplo @ → %40).",
    );
  }
  const [, credenciales, , ruta] = partes;
  if (!credenciales || !credenciales.includes(":")) {
    return malFormada("DATABASE_URL no lleva usuario y contraseña (usuario:contraseña@…).");
  }
  if (!ruta || ruta === "/") {
    return malFormada(
      "DATABASE_URL no indica la base de datos: escribe /valentia justo antes del «?» (…mongodb.net/valentia?retryWrites=true…).",
    );
  }
  return null;
}

/** Explica un error de conexión (de Prisma, del driver de MongoDB o de conTiempoLimite) */
export function explicarErrorBD(error: unknown): ErrorBDExplicado {
  const detalle = ocultarSecretos(textoDelError(error));
  const t = detalle.toLowerCase();
  const es = (motivo: MotivoErrorBD, explicacion: string): ErrorBDExplicado => ({
    motivo,
    explicacion,
    detalle,
  });

  if (error instanceof TiempoAgotadoError) {
    return es(
      "tiempo-agotado",
      "La base de datos no ha respondido a tiempo. Si es la primera comprobación tras arrancar, repítela (la primera conexión con Atlas tarda más). Si sigue: revisa que el clúster de Atlas esté en marcha (no en pausa) y que Network Access permite la IP desde la que te conectas.",
    );
  }
  if (/bad auth|authentication failed|auth failed|scram/.test(t)) {
    return es(
      "credenciales",
      "Usuario o contraseña incorrectos. Comprueba el usuario en Atlas (Database Access) y que la contraseña de DATABASE_URL es la suya (si tiene símbolos, codificados: @ → %40).",
    );
  }
  if (/not authorized|unauthorized|requires authentication|code: 13\b/.test(t)) {
    return es(
      "sin-permisos",
      "El usuario entra pero no tiene permiso sobre esta base de datos. En Atlas → Database Access, dale readWrite sobre la base de datos de DATABASE_URL (valentia).",
    );
  }
  if (
    /invalid connection string|mongoparseerror|invalid scheme|invalid uri|p1013|malformed/.test(t)
  ) {
    return es(
      "direccion-mal-formada",
      "La dirección DATABASE_URL está mal escrita. Cópiala de nuevo desde Atlas → Connect → Drivers y pon /valentia antes del «?».",
    );
  }
  if (/enotfound|querysrv|dns|no such host|failed to lookup/.test(t)) {
    return es(
      "host-no-encontrado",
      "No se encuentra el servidor del clúster. El nombre del clúster de DATABASE_URL (…mongodb.net) está mal o el clúster se ha borrado.",
    );
  }
  // Atlas corta el saludo TLS ("fatal alert: InternalError") cuando la IP no está en Network Access
  if (
    /internalerror|internal error|tlsv1 alert|ssl alert|handshake|econnreset|econnrefused|replicasetnoprimary|no available servers|server selection|serverselection|p1001|timed out|timeout/.test(
      t,
    )
  ) {
    return es(
      "conexion-rechazada",
      "El clúster rechaza la conexión. Lo más habitual: la IP desde la que te conectas (tu ordenador o las IP de salida de Render) no está en Atlas → Network Access del proyecto de ese clúster, o el clúster está en pausa. Revisa también que DATABASE_URL apunta al clúster del proyecto correcto.",
    );
  }
  return es("desconocido", "Error al conectar con la base de datos (ver el detalle en los logs).");
}
