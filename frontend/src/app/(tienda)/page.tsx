import { AvisoApertura } from "@/components/portada/AvisoApertura";
import { BloqueComoFunciona } from "@/components/portada/BloqueComoFunciona";
import { BloqueFinal } from "@/components/portada/BloqueFinal";
import { PortadaRobot } from "@/components/portada/PortadaRobot";
import { BloqueConfigurador } from "@/components/tienda/BloqueConfigurador";
import { BloqueCursoQR } from "@/components/tienda/BloqueCursoQR";
import { DatosEstructurados } from "@/components/seo/DatosEstructurados";
import { HeroKit } from "@/components/tienda/HeroKit";
import { SeccionKit } from "@/components/tienda/SeccionKit";
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
    "Kits de robótica para montar en casa, con Arduino o ESP32 y un curso en vídeo incluido. Sin saber programar y para cualquier edad: un regalo original. Envío a la Comunidad Valenciana.",
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

  return (
    <>
      <DatosEstructurados datos={datosTienda()} />
      <PortadaRobot />
      {!abierta && <AvisoApertura />}
      <BloqueComoFunciona cifras={cifras} />
      {estrella && <HeroKit kit={estrella} compraAbierta={abierta} />}
      {resto.map((kit, i) => (
        <SeccionKit
          key={kit.id}
          kit={kit}
          tema={i % 2 === 0 ? "oscuro" : "claro"}
          compraAbierta={abierta}
        />
      ))}
      <BloqueConfigurador />
      <BloqueCursoQR />
      <BloqueFinal compraAbierta={abierta} />
    </>
  );
}
