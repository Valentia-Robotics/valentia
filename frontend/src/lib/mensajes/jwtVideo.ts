/**
 * FIRMA DEL JWT DE JaaS (videollamadas dentro de la web). Un JWT es un «pase» firmado: 8x8 comprueba
 * con nuestra clave pública que lo hemos dado nosotros y deja entrar a esa persona en esa sala.
 * La clave privada solo está en las variables del servidor (JAAS_CLAVE_PRIVADA), nunca en el navegador.
 * Sin "server-only" para poder probarlo con Vitest; solo lo importa src/lib/mensajes/llamadas.ts.
 */
import { createSign } from "node:crypto";

const base64url = (datos: string | Buffer) => Buffer.from(datos).toString("base64url");

export function firmarJwt(datos: object, kid: string, clavePrivada: string): string {
  const cabecera = base64url(JSON.stringify({ alg: "RS256", kid, typ: "JWT" }));
  const cuerpo = base64url(JSON.stringify(datos));
  const firma = createSign("RSA-SHA256").update(`${cabecera}.${cuerpo}`).sign(clavePrivada);
  return `${cabecera}.${cuerpo}.${base64url(firma)}`;
}
