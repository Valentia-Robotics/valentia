import { AvisoApertura } from "@/components/portada/AvisoApertura";
import { BloqueComoFunciona } from "@/components/portada/BloqueComoFunciona";
import { BloqueFinal } from "@/components/portada/BloqueFinal";
import { HeroPortada } from "@/components/portada/HeroPortada";
import { KitsPortada } from "@/components/portada/KitsPortada";
import { Marquesina } from "@/components/portada/Marquesina";
import { PortadaRobot } from "@/components/portada/PortadaRobot";
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
 * PÁGINA DE INICIO (estilo «taller»: carteles, campos de color con píxeles vivos, líneas de puntos)
 *   1. Campo de color con el titular y las dos entradas (HeroPortada) y la cinta de piezas reales
 *   2. El robot que se desmonta al hacer scroll (3D o dibujo ligero)
 *      (debajo, mientras la tienda no cobra, un aviso pequeño con «Avísame»)
 *   3. Cómo funciona, en tres pasos, con cifras reales
 *   4. Los kits: el destacado en grande y todos en una tabla para compararlos
 *   5. "O elige tú las piezas" → configurador (tramo oscuro)
 *   6. El curso incluido con el QR de la caja
 *   7. Invitación final, sobre negro con los mismos píxeles que el principio
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

  return (
    <>
      <DatosEstructurados datos={datosTienda()} />
      <HeroPortada cifras={cifras} />
      <Marquesina piezas={componentes.map((c) => ({ nombre: c.nombre, categoria: c.categoria }))} />
      <PortadaRobot />
      {!abierta && <AvisoApertura />}
      <BloqueComoFunciona cifras={cifras} />
      <KitsPortada
        estrella={estrella && estrella.precioCentimos > 0 ? estrella : aLaVenta[0]}
        kits={aLaVenta}
        compraAbierta={abierta}
      />
      {/* Un solo paso a oscuro (configurador) y vuelta a claro: la página fluye sin cortes */}
      <Fundido desde="blanco" hasta="grafito" />
      <BloqueConfigurador />
      <Fundido desde="grafito" hasta="blanco" />
      <BloqueCursoQR />
      <Fundido desde="blanco" hasta="tinta" corto />
      <BloqueFinal compraAbierta={abierta} />
    </>
  );
}
