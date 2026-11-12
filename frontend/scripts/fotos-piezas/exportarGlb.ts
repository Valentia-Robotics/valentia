/**
 * MODELOS 3D DE LAS PIEZAS EN .glb (se ejecuta dentro de un navegador, lo abre scripts/modelos-glb.mjs)
 * Son las mismas piezas que salen en las fotos del configurador (modelos.ts), guardadas como archivo 3D
 * para el visor de la tienda. Se guardan en milímetros, como los que exportará Alonso desde su CAD.
 */
import { Box3, Group, Vector3 } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { MODELOS } from "./modelos";
import { Taller } from "./taller";

/** Las piezas de modelos.ts están en centímetros: el visor espera milímetros */
const MM_POR_UNIDAD = 10;

async function exportar(slug: string): Promise<string> {
  const modelo = MODELOS[slug];
  if (!modelo) throw new Error(`No hay modelo para ${slug}`);
  const taller = new Taller();
  modelo.construir(taller);

  // Centrada y apoyada en el suelo, a escala real
  const raiz = new Group();
  raiz.name = slug;
  raiz.add(taller.grupo);
  raiz.scale.setScalar(MM_POR_UNIDAD);
  raiz.updateMatrixWorld(true);
  const caja = new Box3().setFromObject(raiz);
  const centro = caja.getCenter(new Vector3());
  taller.grupo.position.sub(
    new Vector3(centro.x, caja.min.y, centro.z).divideScalar(MM_POR_UNIDAD),
  );

  const glb = (await new GLTFExporter().parseAsync(raiz, {
    binary: true,
    maxTextureSize: 1024,
  })) as ArrayBuffer;

  // De binario a base64 para devolverlo a Node
  let texto = "";
  const bytes = new Uint8Array(glb);
  for (let i = 0; i < bytes.length; i += 0x8000)
    texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(texto);
}

Object.assign(window, { exportar, piezas: Object.keys(MODELOS) });
