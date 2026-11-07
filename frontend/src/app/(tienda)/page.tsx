import { AvisoApertura } from "@/components/portada/AvisoApertura";
import { BloqueComoFunciona } from "@/components/portada/BloqueComoFunciona";
import { BloqueFinal } from "@/components/portada/BloqueFinal";
import { PortadaRobot } from "@/components/portada/PortadaRobot";
import { BloqueConfigurador } from "@/components/tienda/BloqueConfigurador";
import { BloqueCursoQR } from "@/components/tienda/BloqueCursoQR";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { HeroKit } from "@/components/tienda/HeroKit";
import { SeccionKit } from "@/components/tienda/SeccionKit";
import { Fundido, type ColorFundido } from "@/components/ui/Fundido";
import type { Metadata } from "next";
import { metadatosPagina } from "@/lib/metadatos";
import { obtenerCifras, obtenerKits } from "@/lib/catalogo";
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
    "Kits de robótica para montar en casa, con Arduino o ESP32 y curso en vídeo. Sin saber programar y para cualquier edad: un regalo original.",
  ruta: "/",
});

/**
 * PÁGINA DE INICIO (estilo web de Apple)
 *   1. Robot protagonista: en 3D (o dibujo ligero) que se despieza al hacer scroll
 *      (debajo, mientras la tienda no cobra, un aviso pequeño con «Avísame»)
 *   2. Cómo funciona, en tres pasos, con cifras reales
 *   3. El kit estrella (el marcado como "destacado" en el panel) y los demás kits
 *   4. Bloque "Crea tu propio robot" → configurador
 *   5. Bloque que explica el curso incluido con el QR de la caja
 *   6. Invitación final
 */
export default async function Inicio() {
  const [kits, cifras] = await Promise.all([obtenerKits(), obtenerCifras()]);
  const estrella = kits.find((k) => k.destacado) ?? kits[0];
  // Los kits gratis (sin piezas) solo salen en /kits: la portada enseña lo que se monta
  const resto = kits.filter((k) => k.id !== estrella?.id && k.precioCentimos > 0);
  const abierta = compraAbierta();
  // Cada Fundido tiene que empezar en el color exacto de la sección de arriba
  const colorTrasKits: ColorFundido = resto.length > 0 ? "tinta" : estrella ? "niebla" : "blanco";

  return (
    <>
      <DatosEstructurados datos={datosTienda()} />
      <PortadaRobot />
      {!abierta && (
        <>
          <Fundido desde="blanco" hasta="niebla" corto />
          <AvisoApertura />
          <Fundido desde="niebla" hasta="blanco" corto />
        </>
      )}
      <BloqueComoFunciona cifras={cifras} />
      {estrella && (
        <>
          <Fundido desde="blanco" hasta="niebla" corto />
          <HeroKit kit={estrella} compraAbierta={abierta} />
        </>
      )}
      {/* Un solo tramo oscuro para todos los kits y el configurador: la página va de claro a oscuro
          y vuelve, como un recorrido, en vez de cambiar de color en cada sección */}
      {resto.length > 0 && <Fundido desde="niebla" hasta="tinta" />}
      {resto.map((kit) => (
        <SeccionKit key={kit.id} kit={kit} tema="oscuro" compraAbierta={abierta} />
      ))}
      <Fundido desde={colorTrasKits} hasta="grafito" corto={resto.length > 0} />
      <BloqueConfigurador />
      <Fundido desde="grafito" hasta="blanco" />
      <BloqueCursoQR />
      <Fundido desde="blanco" hasta="tinta" />
      <BloqueFinal compraAbierta={abierta} />
      <Fundido desde="tinta" hasta="blanco" />
    </>
  );
}
