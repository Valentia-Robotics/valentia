import { BloqueConfigurador } from "@/components/tienda/BloqueConfigurador";
import { BloqueCursoQR } from "@/components/tienda/BloqueCursoQR";
import { HeroKit } from "@/components/tienda/HeroKit";
import { SeccionKit } from "@/components/tienda/SeccionKit";
import { obtenerKits } from "@/lib/catalogo";

/**
 * PÁGINA DE INICIO (estilo web de Apple)
 *   1. Portada con el kit estrella (el marcado como "destacado" en data/kits.json)
 *   2. Una sección por cada uno de los demás kits, alternando fondo oscuro y claro
 *   3. Bloque "Crea tu propio robot" → configurador
 *   4. Bloque que explica el curso incluido con el QR de la caja
 */
export default async function Inicio() {
  const kits = await obtenerKits();
  const estrella = kits.find((k) => k.destacado) ?? kits[0];
  const resto = kits.filter((k) => k.id !== estrella?.id);

  return (
    <>
      {estrella && <HeroKit kit={estrella} />}
      {resto.map((kit, i) => (
        <SeccionKit key={kit.id} kit={kit} tema={i % 2 === 0 ? "oscuro" : "claro"} />
      ))}
      <BloqueConfigurador />
      <BloqueCursoQR />
    </>
  );
}
