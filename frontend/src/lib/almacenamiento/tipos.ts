/**
 * Lo que tiene que saber hacer cualquier "almacén" de archivos (el disco local ahora,
 * un servicio en la nube cuando se publique la web).
 */
export interface Almacen {
  /**
   * Guarda un archivo y devuelve la dirección pública con la que se verá en la web
   * (por ejemplo "/subidas/componentes/abc.webp" o "https://cdn…/abc.webp").
   */
  guardar(ruta: string, datos: Buffer, tipoContenido: string): Promise<string>;
  /** Borra un archivo a partir de su dirección pública. Si no es suyo, no hace nada. */
  borrar(url: string): Promise<void>;
}
