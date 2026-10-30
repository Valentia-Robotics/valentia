import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * TARJETA PARA REDES (1200 × 630): lo que se ve al compartir un enlace de la web en
 * WhatsApp, Telegram, TikTok, Facebook, X… La usan src/app/opengraph-image.tsx (portada y
 * páginas generales) y src/app/(tienda)/kits/[slug]/opengraph-image.tsx (cada kit).
 *
 * La foto es un PNG de public/images/redes (las fotos 3D se hacen con npm run fotos:piezas;
 * las redes no admiten SVG). Si no existe, la tarjeta sale solo con texto.
 */
export const TAMANO_REDES = { width: 1200, height: 630 };

/** Lee una foto de public/ como data URL (o null si no está) */
export async function fotoRedes(ruta: string): Promise<string | null> {
  try {
    const datos = await readFile(
      path.join(/* turbopackIgnore: true */ process.cwd(), "public", ruta),
    );
    return `data:image/png;base64,${datos.toString("base64")}`;
  } catch {
    return null;
  }
}

export function TarjetaRedes({
  antetitulo,
  titulo,
  subtitulo,
  pie,
  foto,
}: {
  antetitulo: string;
  titulo: string;
  subtitulo: string;
  /** Línea final en azul (precio, «curso incluido»…) */
  pie: string;
  foto: string | null;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#ffffff",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Suelo gris claro detrás de la foto, como en la web */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 600,
          height: 630,
          background: "#f4f4f2",
          display: "flex",
        }}
      />
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto}
          alt=""
          width={600}
          height={355}
          style={{ position: "absolute", right: 0, top: 160, width: 600, height: 355 }}
        />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: foto ? 580 : 1000,
          padding: "64px 0 64px 72px",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 16, color: "#0b0b0b" }}>VALENTIA</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 22,
              color: "#2d4bff",
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {antetitulo}
          </div>
          <div
            style={{
              fontSize: titulo.length > 26 ? 58 : 70,
              lineHeight: 1.05,
              color: "#0b0b0b",
              fontWeight: 600,
              marginTop: 16,
            }}
          >
            {titulo}
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, color: "#6b6b6b", marginTop: 22 }}>
            {subtitulo}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 8, borderRadius: 4, background: "#2d4bff" }} />
          <div style={{ fontSize: 24, color: "#0b0b0b", fontWeight: 600, whiteSpace: "nowrap" }}>
            {pie}
          </div>
        </div>
      </div>
    </div>
  );
}
