import { Contenedor } from "@/components/ui/Contenedor";
import { MarcoCAD } from "@/components/ui/MarcoCAD";
import type { KitConPiezas } from "@/lib/catalogo";

/**
 * Extracto real del firmware del VR1 (firmware/coche-esp32/coche-esp32.ino): el mapa de pines y el
 * lazo de seguimiento de línea. Si cambia el firmware, se cambia aquí.
 */
const CODIGO = `// Driver L298N y sensores (mapa de pines de la ESP32)
const int ENA = 14, IN1 = 27, IN2 = 26;   // motor izquierdo
const int ENB = 32, IN3 = 25, IN4 = 33;   // motor derecho
const int LINEA_IZQ = 34, LINEA_DER = 35; // TCRT5000, salida D0
const int TRIG = 5, ECHO = 18;            // HC-SR04P a 3,3 V

void seguirLinea() {
  bool izq = digitalRead(LINEA_IZQ) == SOBRE_NEGRO;
  bool der = digitalRead(LINEA_DER) == SOBRE_NEGRO;
  if (izq && !der) mover(-VELOCIDAD_AUTO / 2, VELOCIDAD_AUTO);
  else if (der && !izq) mover(VELOCIDAD_AUTO, -VELOCIDAD_AUTO / 2);
  else mover(VELOCIDAD_AUTO, VELOCIDAD_AUTO);
}`;

const PALABRAS = /\b(const|int|bool|void|if|else|return|long|unsigned)\b/;

/** Colorea una línea de C++: comentarios en gris, palabras clave en claro, números en naranja */
function Linea({ texto }: { texto: string }) {
  const [codigo, ...comentario] = texto.split("//");
  const trozos = codigo.split(/(\b\d+\b|\b(?:const|int|bool|void|if|else|return|long|unsigned)\b)/);
  return (
    <>
      {trozos.map((t, i) =>
        /^\d+$/.test(t) ? (
          <span key={i} className="text-acento">
            {t}
          </span>
        ) : PALABRAS.test(t) ? (
          <span key={i} className="text-tinta">
            {t}
          </span>
        ) : (
          <span key={i} className="text-grafito/80">
            {t}
          </span>
        ),
      )}
      {comentario.length > 0 && <span className="text-gris-claro">{`//${comentario.join("//")}`}</span>}
    </>
  );
}

/**
 * SEC_04 · FIRMWARE Y CURSO: el código real del VR1 en un editor y, al lado, cómo se desbloquea el
 * curso (QR → /activar) con sus lecciones de la BD.
 */
export function FirmwarePortada({ kit }: { kit: KitConPiezas | undefined }) {
  const lecciones = kit?.curso.lecciones ?? [];
  const minutos = lecciones.reduce((n, l) => n + (l.duracionMin ?? 0), 0);
  return (
    <section aria-labelledby="titulo-firmware" className="border-t border-linea py-20 sm:py-28">
      <Contenedor>
        <div className="aparecer max-w-3xl">
          <p className="mono-etiqueta text-gris">
            <span className="text-acento">{"// "}</span>SEC_04 · Firmware y curso
          </p>
          <h2 id="titulo-firmware" className="titular-cartel mt-4 text-4xl font-semibold sm:text-6xl">
            Del primer GPIO al lazo cerrado.
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-gris">
            Cada kit trae una tarjeta con un código único. Al escanearla se abre su curso: vídeo,
            test y un reto de código por lección, sobre el mismo firmware que lleva el coche.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* Editor */}
          <MarcoCAD etiqueta="coche-esp32.ino" cota="C++ · Arduino" className="aparecer min-w-0 bg-panel">
            <pre className="overflow-x-auto px-4 pt-7 pb-5 font-mono text-[12px] leading-[1.7] sm:px-5 sm:text-[12.5px]">
              <code>
                {CODIGO.split("\n").map((linea, i) => (
                  <span key={i} className="block whitespace-pre">
                    <span aria-hidden="true" className="mr-4 inline-block w-5 text-right text-gris-claro select-none">
                      {i + 1}
                    </span>
                    <Linea texto={linea} />
                  </span>
                ))}
              </code>
            </pre>
          </MarcoCAD>

          {/* Activación y temario */}
          <MarcoCAD etiqueta="Activación" cota={kit ? "VR1" : undefined} className="aparecer min-w-0 bg-carbon">
            <div className="px-4 pt-7 pb-5 font-mono text-[12px] leading-relaxed sm:px-5">
              <p className="text-gris">
                <span className="text-acento">$</span> escanear QR de la tarjeta
              </p>
              <p className="text-tinta">→ /activar?codigo=VAL-XXXX-XXXX</p>
              <p className="mt-1 flex items-center gap-2 text-tinta">
                <span className="led text-led" aria-hidden="true" />
                curso desbloqueado en «Mis cursos»
              </p>
              {lecciones.length > 0 && (
                <>
                  <p className="mono-etiqueta mt-6 flex justify-between border-b border-linea pb-2 text-gris">
                    <span>Temario</span>
                    <span>
                      {lecciones.length} lecciones{minutos ? ` · ${minutos} min` : ""}
                    </span>
                  </p>
                  <ol>
                    {lecciones.map((l, i) => (
                      <li key={l.slug} className="flex gap-3 border-b border-linea py-2">
                        <span className="text-gris-claro">L{String(i + 1).padStart(2, "0")}</span>
                        <span className="min-w-0 flex-1 text-tinta">{l.titulo}</span>
                        {l.duracionMin ? <span className="text-gris">{l.duracionMin}′</span> : null}
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </MarcoCAD>
        </div>
      </Contenedor>
    </section>
  );
}
