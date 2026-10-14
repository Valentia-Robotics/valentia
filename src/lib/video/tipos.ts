/**
 * Lo que tiene que saber hacer cada servicio de vídeo (YouTube, Vimeo…).
 * Para añadir uno nuevo: crea un archivo en proveedores/ con este formato
 * y añádelo a la lista de proveedores/index.ts. No hay que tocar nada más.
 */
export interface ProveedorVideo {
  /** Identificador interno, en minúsculas: "youtube" */
  id: string;
  /** Nombre que se ve: "YouTube" */
  nombre: string;
  /** Ejemplo para el formulario del panel */
  ejemplo: string;
  /** Saca el identificador del vídeo de una dirección web. null si la dirección no es de este servicio. */
  idDesdeUrl(url: URL): string | null;
  /** true si el texto parece un identificador de este servicio escrito tal cual ("dQw4w9WgXcQ") */
  esIdentificador(texto: string): boolean;
  /** Dirección normal del vídeo (la que se guarda en la base de datos) */
  urlNormal(id: string): string;
  /** Dirección del reproductor para incrustarlo en la lección */
  urlIncrustada(id: string): string;
}
