"use client";

/**
 * ERROR GRAVE: si falla hasta la plantilla principal de la web. Tiene que llevar su propio
 * <html> y estilos sencillos escritos aquí (puede que el resto de la web no haya cargado).
 */
export default function ErrorGlobal({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#0b0b0b",
          background: "#f4f4f2",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <main>
          <p style={{ color: "#2d4bff", fontSize: 14 }}>Error 500</p>
          <h1 style={{ fontSize: 36, fontWeight: 500, margin: "12px 0" }}>
            Se nos ha cruzado un cable
          </h1>
          <p style={{ color: "#6b6b6b", maxWidth: 420 }}>
            Algo ha fallado por nuestra parte. Vuelve a intentarlo en un momento.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 28px",
              borderRadius: 999,
              border: 0,
              background: "#0b0b0b",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
