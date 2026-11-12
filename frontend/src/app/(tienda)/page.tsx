import { BancoPruebasPortada } from "@/components/portada/BancoPruebasPortada";
import { BloqueFinal } from "@/components/portada/BloqueFinal";
import { DespieceVR1 } from "@/components/portada/DespieceVR1";
import { FirmwarePortada } from "@/components/portada/FirmwarePortada";
import { LineaProducto } from "@/components/portada/LineaProducto";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { obtenerKitsConPiezas } from "@/lib/catalogo";
import { datosTienda } from "@/lib/datosEstructurados";
import { compraAbierta } from "@/lib/pagos";

/**
 * Se genera al compilar y se vuelve a leer de la base de datos cada 5 minutos como mucho: así el catálogo
 * cargado después del build (npm run seed:prod en el Pre-Deploy de Render) aparece sin volver a desplegar.
 * Los cambios del panel se ven al momento (refrescarTienda).
 */
export const revalidate = 300;

export const metadata: Metadata = metadatosPagina({
  descripcion:
    "Kits de robótica modular sobre ESP32 y Arduino: chasis de bajo perfil, motores DC con reductora, sensores de línea y ultrasonidos, montaje sin soldadura y curso de firmware en C++.",
  ruta: "/",
});

/** El kit que se despieza en la portada */
const SLUG_VR1 = "vr1-starter-kit";

/**
 * PÁGINA DE INICIO (estilo industrial, PROMPT_REDISENO.md):
 *   SEC_00/01 · El VR1 en 3D sobre el escritorio; al bajar se despieza en sus cinco capas (DespieceVR1)
 *   SEC_02 · Línea de producto: una hoja técnica por kit
 *   SEC_03 · Banco de pruebas: esquema de bloques y lecturas del VR1 → configurador
 *   SEC_04 · Firmware real del VR1 y temario del curso
 *   SEC_05 · Estado de la tienda: lista de espera mientras no se cobra (o «elegir kit»)
 * Todos los datos salen de la base de datos (piezas, precios, lecciones) o del firmware.
 */
export default async function Inicio() {
  const kits = await obtenerKitsConPiezas();
  // Los kits gratis (sin piezas) solo salen en /kits: la portada enseña lo que se monta
  const aLaVenta = kits.filter((k) => k.precioCentimos > 0);
  const vr1 = aLaVenta.find((k) => k.slug === SLUG_VR1);
  const abierta = compraAbierta();

  return (
    <>
      <DatosEstructurados datos={datosTienda()} />
      <DespieceVR1
        precioCentimos={vr1?.precioCentimos ?? null}
        bom={(vr1?.piezas ?? []).map((p) => ({
          cantidad: p.cantidad,
          nombre: p.componente.nombre,
        }))}
        lecciones={vr1?.curso.lecciones.length ?? null}
        compraAbierta={abierta}
      />
      <LineaProducto kits={aLaVenta} />
      <BancoPruebasPortada kit={vr1} />
      <FirmwarePortada kit={vr1} />
      <BloqueFinal compraAbierta={abierta} />
    </>
  );
}
