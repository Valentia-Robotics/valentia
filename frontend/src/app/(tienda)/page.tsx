import { BloqueComoFunciona } from "@/components/portada/BloqueComoFunciona";
import { BloqueFinal } from "@/components/portada/BloqueFinal";
import { HeroCoche } from "@/components/portada/HeroCoche";
import { KitsPortada } from "@/components/portada/KitsPortada";
import { BloqueConfigurador } from "@/components/tienda/BloqueConfigurador";
import { BloqueCursoQR } from "@/components/tienda/BloqueCursoQR";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { obtenerKits } from "@/lib/catalogo";
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
    "Kits de robótica para montar en casa, con Arduino o ESP32 y curso en vídeo. No hace falta saber programar, y también es un buen regalo.",
  ruta: "/",
});

/**
 * PÁGINA DE INICIO (estilo «estudio»). Un orden claro, una idea por pantalla y nada que aparezca de golpe:
 *   1. El coche VR1 en 3D con el titular; al bajar se abre y cuenta sus cinco piezas (HeroCoche)
 *   2. Los kits: una tarjeta por kit
 *   3. Cómo funciona, en tres pasos
 *   4. El curso que trae cada kit (la tarjeta QR)
 *   5. El configurador
 *   6. Final: lista de espera mientras la tienda no cobra (o «elige tu kit»)
 */
export default async function Inicio() {
  const kits = await obtenerKits();
  // Los kits gratis (sin piezas) solo salen en /kits: la portada enseña lo que se monta
  const aLaVenta = kits.filter((k) => k.precioCentimos > 0);
  const abierta = compraAbierta();

  return (
    <>
      <DatosEstructurados datos={datosTienda()} />
      <HeroCoche compraAbierta={abierta} />
      <KitsPortada kits={aLaVenta} />
      <BloqueComoFunciona />
      <BloqueCursoQR />
      <BloqueConfigurador />
      <BloqueFinal compraAbierta={abierta} />
    </>
  );
}
