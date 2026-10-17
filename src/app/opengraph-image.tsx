import { ImageResponse } from "next/og";
import { marca } from "@/config/marca";

/**
 * Imagen que aparece al compartir la web en redes sociales y mensajería (1200 × 630).
 * Se genera al compilar con los colores de la marca; no hace falta diseñarla a mano.
 */
export const alt = `${marca.nombre}: ${marca.lema}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagenParaRedes() {
  const rueda = (izquierda: number) => (
    <div
      style={{
        position: "absolute",
        left: izquierda,
        top: 214,
        width: 128,
        height: 128,
        borderRadius: 64,
        background: "#0b0b0b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 28, background: "#f4f4f2" }} />
    </div>
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#ffffff",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 600,
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 18, color: "#0b0b0b" }}>VALENTIA</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, color: "#0b0b0b", fontWeight: 600 }}>
            Construye tu propio robot.
          </div>
          <div style={{ fontSize: 30, color: "#6b6b6b", marginTop: 24 }}>
            Kits de robótica con curso incluido
          </div>
        </div>
        <div style={{ width: 120, height: 10, borderRadius: 5, background: "#2d4bff" }} />
      </div>

      {/* Robot sencillo con las mismas formas que el de la portada */}
      <div style={{ position: "relative", display: "flex", width: 460, height: 486 }}>
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 90,
            width: 6,
            height: 70,
            background: "#0b0b0b",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 48,
            top: 76,
            width: 30,
            height: 30,
            borderRadius: 15,
            background: "#7a8cff",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 150,
            width: 110,
            height: 56,
            borderRadius: 12,
            background: "#f4f4f2",
            border: "2px solid #d9d9d6",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 160,
            top: 172,
            width: 190,
            height: 18,
            borderRadius: 4,
            background: "#2d4bff",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 225,
            top: 156,
            width: 56,
            height: 18,
            borderRadius: 3,
            background: "#0b0b0b",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 204,
            width: 410,
            height: 38,
            borderRadius: 12,
            background: "#1a1a1a",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 420,
            top: 150,
            width: 16,
            height: 80,
            borderRadius: 4,
            background: "#2d4bff",
          }}
        />
        {rueda(40)}
        {rueda(290)}
      </div>
    </div>,
    size,
  );
}
