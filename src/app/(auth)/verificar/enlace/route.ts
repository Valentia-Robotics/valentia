/**
 * ENLACE DEL CORREO «Confirma tu email» que se envía desde el panel (/verificar/enlace?t=…)
 * Pone en este navegador la cookie de la verificación y lleva a /verificar para escribir el
 * código. Si el enlace ya no vale (usado, caducado o cuenta ya confirmada), lleva a /login.
 */
import { NextResponse, type NextRequest } from "next/server";
import { abrirEnlaceVerificacion } from "@/lib/verificacion/codigos";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  // Los tokens son 43 caracteres base64url (ver generarToken)
  const valido = /^[\w-]{20,100}$/.test(token) && (await abrirEnlaceVerificacion(token));
  // Dirección relativa: en Render la petición llega con la dirección interna (localhost:10000)
  return new NextResponse(null, {
    status: 303,
    headers: { Location: valido ? "/verificar" : "/login" },
  });
}
