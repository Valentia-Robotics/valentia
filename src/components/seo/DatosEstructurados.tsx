/**
 * Inserta datos estructurados (JSON-LD) en la página para Google. No se ve en pantalla.
 * Se cambia "<" por su código para que ningún texto pueda cerrar la etiqueta <script>.
 */
export function DatosEstructurados({ datos }: { datos: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}
