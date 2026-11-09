/**
 * CAMPOS OPCIONALES SIEMPRE GUARDADOS (como null) EN MONGODB
 *
 * En MongoDB, si al crear un documento no se rellena un campo opcional, Prisma no lo guarda: el campo
 * "no existe". Y el filtro { usadoEn: null } solo encuentra los que valen null, NO los que no tienen
 * el campo. Sin esto, por ejemplo, ningún código de activación se podría canjear.
 *
 * La extensión de abajo rellena con null los campos opcionales que falten al crear (create,
 * createMany y la parte "create" de upsert), así los filtros con null funcionan igual que en SQL.
 * Lo usan la web (src/lib/db.ts), el seed y los scripts.
 *
 * OJO: no cubre las creaciones anidadas (por ejemplo, las líneas creadas dentro de pedido.create).
 * Ninguna de esas colecciones se filtra por null; si algún día hiciera falta, crea esos documentos
 * por separado. nulos.test.ts comprueba que esta lista coincide con prisma/schema.prisma.
 */
import { Prisma } from "../generated/prisma/client";

/** Campo opcional; "relacion" = la relación a la que pertenece (si llega la relación, no se toca) */
type Opcional = { campo: string; relacion?: string };

/** Campos opcionales de cada colección (los Json? no: no se filtran y null ahí es otra cosa) */
export const OPCIONALES: Record<string, Opcional[]> = {
  Componente: [{ campo: "voltajeLogico" }, { campo: "voltajeLogicoMin" }],
  ListaEspera: [{ campo: "kitSlug" }, { campo: "avisadoEn" }],
  Visita: [{ campo: "origen" }],
  Ejercicio: [{ campo: "correcta" }, { campo: "explicacion" }, { campo: "solucion" }],
  Pedido: [
    { campo: "usuarioId", relacion: "usuario" },
    { campo: "referenciaPago" },
    { campo: "numeroSeguimiento" },
    { campo: "aceptaCondicionesEn" },
    { campo: "pagadoEn" },
    { campo: "enviadoEn" },
    { campo: "entregadoEn" },
    { campo: "canceladoEn" },
    { campo: "correoConfirmacionEn" },
  ],
  LineaPedido: [{ campo: "slug" }],
  CodigoActivacion: [
    { campo: "pedidoId", relacion: "pedido" },
    { campo: "usadoEn" },
    { campo: "usuarioId", relacion: "usuario" },
    { campo: "desactivadoEn" },
    { campo: "loteId", relacion: "lote" },
  ],
  Usuario: [{ campo: "emailVerificadoEn" }],
  Verificacion: [
    { campo: "usuarioId", relacion: "usuario" },
    { campo: "confirmadoEn" },
    { campo: "usadoEn" },
  ],
  DispositivoConfianza: [
    { campo: "paseHash" },
    { campo: "paseCaducaEn" },
    { campo: "sesionCerradaEn" },
  ],
  ProgresoEjercicio: [{ campo: "respuesta" }],
  Guion: [
    { campo: "plataformaOtra" },
    { campo: "kitId", relacion: "kit" },
    { campo: "editorId", relacion: "editor" },
    { campo: "creadoPorId", relacion: "creadoPor" },
    { campo: "notasEditor" },
    { campo: "enlaceVideo" },
  ],
  Articulo: [
    { campo: "imagenUrl" },
    { campo: "imagenAlt" },
    { campo: "imagenCredito" },
    { campo: "fuenteUrl" },
    { campo: "fuenteTitulo" },
    { campo: "autorId" },
    { campo: "programadoPara" },
    { campo: "publicadoEn" },
  ],
  LlamadaBlog: [{ campo: "detalle" }, { campo: "articuloId" }],
  CambioEstadoGuion: [
    { campo: "estadoAnterior" },
    { campo: "usuarioId", relacion: "usuario" },
    { campo: "editorId" },
    { campo: "comentario" },
  ],
};

/** Devuelve los datos con null en los campos opcionales que no vengan */
export function conNulos<T>(modelo: string, datos: T): T {
  const opcionales = OPCIONALES[modelo];
  if (!opcionales || !datos || typeof datos !== "object") return datos;
  const copia = { ...(datos as Record<string, unknown>) };
  for (const { campo, relacion } of opcionales) {
    if (campo in copia || (relacion && relacion in copia)) continue;
    copia[campo] = null;
  }
  return copia as T;
}

/** Extensión de Prisma: new PrismaClient().$extends(extensionNulos) */
export const extensionNulos = Prisma.defineExtension({
  name: "nulos-explicitos",
  query: {
    $allModels: {
      create({ model, args, query }) {
        return query({ ...args, data: conNulos(model, args.data) } as typeof args);
      },
      createMany({ model, args, query }) {
        const datos = Array.isArray(args.data)
          ? args.data.map((d) => conNulos(model, d))
          : conNulos(model, args.data);
        return query({ ...args, data: datos } as typeof args);
      },
      upsert({ model, args, query }) {
        return query({ ...args, create: conNulos(model, args.create) } as typeof args);
      },
    },
  },
});
