/**
 * POST /api/v1/guiones: n8n crea aquí un guion en borrador, con token (backend/README.md).
 * Vive en la web para usar un solo servicio de Render. El proxy no pasa por /api: esta ruta no pide sesión.
 */
import { NextResponse } from "next/server";
import { comprobarToken, responderGuion, TAMANO_MAXIMO } from "@/lib/contenido/apiGuiones";

const demasiadoGrande = () =>
  NextResponse.json({ error: "El guion es demasiado grande." }, { status: 413 });

export async function POST(peticion: Request) {
  const rechazo = comprobarToken(peticion.headers.get("authorization"));
  if (rechazo) return NextResponse.json(rechazo.cuerpo, { status: rechazo.status });

  if (Number(peticion.headers.get("content-length") ?? 0) > TAMANO_MAXIMO) return demasiadoGrande();
  const texto = await peticion.text();
  if (Buffer.byteLength(texto) > TAMANO_MAXIMO) return demasiadoGrande();

  let entrada: unknown;
  try {
    entrada = JSON.parse(texto);
  } catch {
    return NextResponse.json({ error: "El cuerpo no es JSON válido." }, { status: 400 });
  }

  const { status, cuerpo } = await responderGuion(entrada);
  return NextResponse.json(cuerpo, { status });
}
