# Modelos 3D de los componentes

Aquí van los archivos 3D de cada pieza para el configurador y su ficha (`/componentes/<slug>`).

1. Nombre del archivo = slug de la pieza (el final de su dirección en la web):
   `esp32-devkit.glb`, `servo-mg996r.stl`, `motor-dc-reductora.obj` (+ `motor-dc-reductora.mtl`).
2. Formatos: **.glb** (el mejor: lleva colores y pesa poco), .gltf, .stl u .obj.
3. Exportar en **milímetros**. Las medidas que ve el cliente salen del propio archivo.
4. Que pese poco: menos de 5 MB por pieza (mejor 1-2 MB). Para comprimir un .glb:
   `npx @gltf-transform/cli optimize entrada.glb salida.glb --compress meshopt`
5. Si sale tumbado, de otro color o en otra unidad: una línea en `AJUSTES_MODELOS`
   (`frontend/src/config/modelos3d.ts`).

Si una pieza no tiene archivo aquí, la web enseña su foto de siempre.
