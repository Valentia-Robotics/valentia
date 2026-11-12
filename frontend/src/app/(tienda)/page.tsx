import { BloqueComoFunciona } from "@/components/portada/BloqueComoFunciona";
import { BloqueFinal } from "@/components/portada/BloqueFinal";
import { HeroPortada } from "@/components/portada/HeroPortada";
import { KitsPortada } from "@/components/portada/KitsPortada";
import { PiezasPortada } from "@/components/portada/PiezasPortada";
import { BloqueConfigurador } from "@/components/tienda/BloqueConfigurador";
import { BloqueCursoQR } from "@/components/tienda/BloqueCursoQR";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { Fundido } from "@/components/ui/Fundido";
import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { obtenerCifras, obtenerComponentes, obtenerKits } from "@/lib/catalogo";
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
 * PÁGINA DE INICIO (estilo «taller»: carteles, campos de color con la placa de circuito, líneas de puntos)
 * Lo primero que se ve después del titular son los kits: es lo que viene a buscar quien entra.
 *   1. Campo de color con el titular y las dos entradas (HeroPortada)
 *   2. Los kits: el destacado como hoja de datos (con el «Avísame» junto al precio mientras la
 *      tienda no cobra) y los demás en tarjetas (GaleriaKits)
 *   3. Cómo funciona, en tres pasos, con cifras reales
 *   4. Las cinco piezas de un robot en un mosaico con «escáner»
 *   5. "O elige tú las piezas" → configurador (tramo oscuro)
 *   6. El curso incluido con el QR de la caja
 *   7. Invitación final, sobre negro con la misma placa que el principio
 */
export default async function Inicio() {
  const [kits, cifras, componentes] = await Promise.all([
    obtenerKits(),
    obtenerCifras(),
    obtenerComponentes(),
  ]);
  const estrella = kits.find((k) => k.destacado) ?? kits[0];
  // Los kits gratis (sin piezas) solo salen en /kits: la portada enseña lo que se monta
  const aLaVenta = kits.filter((k) => k.precioCentimos > 0);
  const abierta = compraAbierta();
  const destacado = estrella && estrella.precioCentimos > 0 ? estrella : aLaVenta[0];

  return (
    <>
      <DatosEstructurados datos={datosTienda()} />
      <HeroPortada cifras={cifras} />
      <KitsPortada
        estrella={destacado}
        // El destacado ya sale en grande: la galería enseña los demás (sin repetirlo)
        kits={aLaVenta.filter((k) => k.slug !== destacado?.slug)}
        compraAbierta={abierta}
      />
      {/* Del verde de placa al blanco, despacio: sin corte entre los kits y lo que sigue */}
      <Fundido desde="placa" hasta="blanco" />
      <BloqueComoFunciona cifras={cifras} />
      <PiezasPortada />
      {/* Recorrido de color: verde (titular y kits) → blanco → negro de estudio (configurador) → blanco → negro (final).
          Cada cambio va con un Fundido: nunca un corte seco de un fondo a otro */}
      <Fundido desde="blanco" hasta="tinta" />
      <BloqueConfigurador componentes={componentes} />
      <Fundido desde="tinta" hasta="blanco" />
      <BloqueCursoQR />
      <Fundido desde="blanco" hasta="tinta" />
      <BloqueFinal compraAbierta={abierta} />
    </>
  );
}
