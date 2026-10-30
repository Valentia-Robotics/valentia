/**
 * FUSIONAR MALLAS (para que el 3D vaya fluido en el móvil)
 * El coche tiene cientos de piececitas (tornillos, pines, radios de las ruedas…) y cada una
 * es una orden de dibujo para la tarjeta gráfica, dos veces por fotograma (también para la
 * sombra). Dentro de una pieza del despiece nada se mueve por separado, así que juntamos todas
 * las mallas que comparten material en una sola: se ve exactamente igual y se dibuja mucho
 * menos. Lo transparente y las mallas con varios materiales se quedan como estaban.
 */
import { Matrix4, Mesh, type BufferGeometry, type Material, type Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Junta las mallas hijas de `grupo` (en cualquier nivel) que comparten material.
 * Devuelve las geometrías nuevas, para liberarlas al destruir la escena.
 */
export function fusionarMallas(grupo: Object3D): BufferGeometry[] {
  grupo.updateMatrixWorld(true);
  const inversa = new Matrix4().copy(grupo.matrixWorld).invert();
  const relativa = new Matrix4();

  // Mallas que se pueden juntar, agrupadas por material, sombras y atributos
  const lotes = new Map<string, { material: Material; mallas: Mesh[] }>();
  grupo.traverse((objeto) => {
    if (!(objeto instanceof Mesh) || Array.isArray(objeto.material)) return;
    const material = objeto.material as Material;
    if (material.transparent || !objeto.visible) return;
    const geo = objeto.geometry as BufferGeometry;
    const atributos = Object.keys(geo.attributes).sort().join(",");
    const clave = [
      material.uuid,
      objeto.castShadow,
      objeto.receiveShadow,
      geo.index ? "i" : "n",
      atributos,
    ].join("|");
    const lote = lotes.get(clave) ?? { material, mallas: [] };
    lote.mallas.push(objeto);
    lotes.set(clave, lote);
  });

  const nuevas: BufferGeometry[] = [];
  for (const { material, mallas } of lotes.values()) {
    if (mallas.length < 2) continue;
    // Cada geometría, colocada donde estaba su malla (relativo al grupo)
    const colocadas = mallas.map((m) => {
      relativa.multiplyMatrices(inversa, m.matrixWorld);
      const copia = m.geometry.clone();
      copia.applyMatrix4(relativa);
      // mergeGeometries exige que todas tengan los mismos grupos: los quitamos (un solo material)
      copia.clearGroups();
      return copia;
    });
    const fusion = mergeGeometries(colocadas, false);
    colocadas.forEach((c) => c.dispose());
    if (!fusion) continue; // no compatibles: se quedan como estaban

    const unida = new Mesh(fusion, material);
    unida.castShadow = mallas[0].castShadow;
    unida.receiveShadow = mallas[0].receiveShadow;
    grupo.add(unida);
    for (const m of mallas) m.removeFromParent();
    nuevas.push(fusion);
  }
  return nuevas;
}
