// ⚠ BORRADOR — pendiente de revisión por un profesional.
import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import Link from "next/link";
import { BotonConfigurarCookies } from "@/components/layout/BotonConfigurarCookies";
import { PaginaLegal, TablaLegal } from "@/components/legal/PaginaLegal";
import { tienda } from "@/config/tienda";

export const metadata: Metadata = metadatosPagina({
  titulo: "Política de cookies",
  descripcion: "Qué cookies usa Valentia, para qué y cómo cambiar tu elección.",
  ruta: "/legal/cookies",
});

const necesarias: [string, string, string][] = [
  ["authjs.session-token", "Mantiene tu sesión iniciada (cifrada).", "30 días"],
  [
    "authjs.csrf-token, authjs.callback-url",
    "Protegen el inicio de sesión y te devuelven a la página en la que estabas.",
    "Sesión",
  ],
  [
    "valentia_dispositivo",
    "Recuerda que este navegador es de confianza para no pedirte un código cada vez.",
    "30 días (7 para administradores)",
  ],
  [
    "valentia_verificacion",
    "Relaciona tu navegador con el código que te hemos enviado por email.",
    "1 hora",
  ],
  [
    "__stripe_mid, __stripe_sid (Stripe)",
    "Prevención del fraude durante el pago. Solo en el paso de pago.",
    "1 año / 30 minutos",
  ],
  ["valentia-carrito (almacenamiento local)", "Guarda tu carrito.", "Hasta que lo vacíes"],
  [
    "valentia-configurador (almacenamiento local)",
    "Guarda el robot que estás montando en el configurador.",
    "Hasta que lo borres",
  ],
  [
    "valentia-consentimiento (almacenamiento local)",
    "Recuerda lo que elegiste en este aviso de cookies.",
    "12 meses",
  ],
];

/** POLÍTICA DE COOKIES (art. 22.2 LSSI-CE y Guía sobre el uso de las cookies de la AEPD) */
export default function PoliticaCookies() {
  return (
    <PaginaLegal titulo="Política de cookies" actualizado="17 de octubre de 2026">
      <p>
        Las cookies son pequeños archivos que una web guarda en tu navegador. En{" "}
        {tienda.empresa.nombreComercial} usamos las mínimas: las necesarias para que la web funcione
        y, solo si nos das permiso, las de los reproductores de vídeo. No usamos cookies de
        publicidad ni de analítica: para saber cuánta gente visita la web contamos las páginas
        vistas sin cookies y sin guardar tu IP (lo explicamos en la{" "}
        <Link href="/legal/privacidad">política de privacidad</Link>).
      </p>

      <h2>1. Cookies necesarias (siempre activas)</h2>
      <p>
        No requieren tu consentimiento porque sin ellas no podríamos darte el servicio que pides.
      </p>
      <TablaLegal titulo="Cookies necesarias">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Para qué sirve</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          {necesarias.map(([nombre, para, duracion]) => (
            <tr key={nombre}>
              <td className="font-mono text-xs">{nombre}</td>
              <td>{para}</td>
              <td>{duracion}</td>
            </tr>
          ))}
        </tbody>
      </TablaLegal>

      <h2>2. Cookies de terceros opcionales: vídeos de los cursos</h2>
      <p>
        Los vídeos de las lecciones pueden estar alojados en YouTube (Google Ireland Ltd.) o Vimeo
        (Vimeo.com, Inc.). Al cargar su reproductor, estos servicios pueden guardar cookies propias
        y recoger datos técnicos de tu navegador según sus políticas. Usamos sus versiones más
        respetuosas (youtube-nocookie.com y Vimeo con «no rastrear»), pero aun así solo los cargamos
        si aceptas la categoría «Vídeos de los cursos». Si no la aceptas, verás un aviso en lugar
        del vídeo.
      </p>

      <h2>3. Cómo cambiar tu elección</h2>
      <p>
        Puedes aceptar o retirar tu consentimiento en cualquier momento, tan fácilmente como lo
        diste:
      </p>
      <p>
        <BotonConfigurarCookies />
      </p>
      <p>
        También puedes borrar las cookies desde la configuración de tu navegador. Si borras las
        necesarias, se cerrará tu sesión y se vaciará tu carrito.
      </p>
    </PaginaLegal>
  );
}
