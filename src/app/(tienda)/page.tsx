import { BloqueComoFunciona } from "@/components/portada/BloqueComoFunciona";
import { BloqueFinal } from "@/components/portada/BloqueFinal";
import { PortadaRobot } from "@/components/portada/PortadaRobot";
import { BloqueConfigurador } from "@/components/tienda/BloqueConfigurador";
import { BloqueCursoQR } from "@/components/tienda/BloqueCursoQR";
import { HeroKit } from "@/components/tienda/HeroKit";
import { SeccionKit } from "@/components/tienda/SeccionKit";
import { obtenerCifras, obtenerKits } from "@/lib/catalogo";

/**
 * PÁGINA DE INICIO (estilo web de Apple)
 *   1. Robot protagonista: en 3D (o dibujo ligero) que se despieza al hacer scroll
 *   2. Cómo funciona, en tres pasos, con cifras reales
 *   3. El kit estrella (el marcado como "destacado" en el panel) y los demás kits
 *   4. Bloque "Crea tu propio robot" → configurador
 *   5. Bloque que explica el curso incluido con el QR de la caja
 *   6. Invitación final
 */
export default async function Inicio() {
  const [kits, cifras] = await Promise.all([obtenerKits(), obtenerCifras()]);
  const estrella = kits.find((k) => k.destacado) ?? kits[0];
  const resto = kits.filter((k) => k.id !== estrella?.id);

  return (
    <>
      <PortadaRobot />
      <BloqueComoFunciona cifras={cifras} />
      {estrella && <HeroKit kit={estrella} />}
      {resto.map((kit, i) => (
        <SeccionKit key={kit.id} kit={kit} tema={i % 2 === 0 ? "oscuro" : "claro"} />
      ))}
      <BloqueConfigurador />
      <BloqueCursoQR />
      <BloqueFinal />
    </>
  );
}
