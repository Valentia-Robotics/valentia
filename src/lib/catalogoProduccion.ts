/**
 * CATÁLOGO PARA PRODUCCIÓN (la parte que decide qué hacer; sin conexiones)
 *
 *   npm run catalogo:exportar  (tu ordenador)  valentia-dev → data/catalogo/*.json
 *   npm run seed:prod          (Render)        data/catalogo/*.json → la base de datos de DATABASE_URL
 *
 * El catálogo de producción se gestiona desde el panel de administración de producción. seed:prod solo
 * rellena lo que FALTA (pensado para ejecutarse en CADA despliegue sin estropear nada):
 *   - Solo las 6 colecciones del catálogo. Usuarios, pedidos, códigos y progreso no se tocan nunca.
 *   - SOLO CREA lo que no existe (con el mismo id que en el JSON, así las relaciones se mantienen).
 *   - NUNCA modifica lo que ya existe en producción (ni precio, ni textos, ni stock…), aunque el JSON sea distinto.
 *   - Tampoco añade piezas, lecciones ni ejercicios a un kit, curso o lección que ya existía: eso también
 *     sería modificarlo. Solo se crean junto con su kit, curso o lección cuando este es nuevo.
 *   - NUNCA borra. Lo que hay en producción y no está en el JSON (por ejemplo, creado en el panel) se queda.
 *   - Recuerda lo que ya estaba o creó (colección CatalogoAplicado): si después se borra desde el panel,
 *     no se vuelve a crear en el siguiente despliegue.
 *   - Si producción ya tiene la ficha con otro id (por ejemplo, cargada con db:catalogo), se reconoce por su
 *     slug y se da por existente (no se duplica).
 */
import { createHash } from "node:crypto";
import { BSON, type ObjectId } from "mongodb";

const { EJSON } = BSON;

/** Colecciones del catálogo, en orden: primero las que no dependen de otras */
export const COLECCIONES_CATALOGO = [
  "Componente",
  "Curso",
  "Kit",
  "KitComponente",
  "Leccion",
  "Ejercicio",
] as const;
export type ColeccionCatalogo = (typeof COLECCIONES_CATALOGO)[number];

/** Colección donde seed:prod recuerda qué aplicó (ver prisma/schema.prisma, modelo CatalogoAplicado) */
export const COLECCION_APLICADOS = "CatalogoAplicado";

/** Un documento tal cual sale de MongoDB */
export type Doc = { _id: ObjectId } & Record<string, unknown>;
export type Catalogo = Record<ColeccionCatalogo, Doc[]>;

/** Campos que apuntan a otra colección del catálogo */
const REFERENCIAS: Record<ColeccionCatalogo, Record<string, ColeccionCatalogo>> = {
  Componente: {},
  Curso: {},
  Kit: { cursoId: "Curso" },
  KitComponente: { kitId: "Kit", componenteId: "Componente" },
  Leccion: { cursoId: "Curso" },
  Ejercicio: { leccionId: "Leccion" },
};

/** Lo que identifica una ficha aunque cambie de id (también son los índices únicos, salvo Ejercicio) */
const CLAVE_NATURAL: Record<ColeccionCatalogo, string[]> = {
  Componente: ["slug"],
  Curso: ["slug"],
  Kit: ["slug"],
  KitComponente: ["kitId", "componenteId"],
  Leccion: ["cursoId", "slug"],
  Ejercicio: ["leccionId", "orden"],
};

/** Índices únicos del esquema (@unique / @@unique): dos fichas no pueden repetirlos */
const UNICOS: Record<ColeccionCatalogo, string[][]> = {
  Componente: [["slug"]],
  Curso: [["slug"]],
  Kit: [["slug"], ["cursoId"]],
  KitComponente: [["kitId", "componenteId"]],
  Leccion: [["cursoId", "slug"]],
  Ejercicio: [],
};

/**
 * Campo que apunta a la ficha "dueña" (las piezas son parte del kit; las lecciones, del curso…).
 * Si la dueña ya existía en producción, sus fichas hijas no se crean: sería modificarla.
 */
const DUENA: Partial<Record<ColeccionCatalogo, string>> = {
  KitComponente: "kitId",
  Leccion: "cursoId",
  Ejercicio: "leccionId",
};

const texto = (valor: unknown) => String(valor);

/** Nombre legible para los mensajes */
export function nombreDoc(doc: Doc): string {
  const nombre = doc.slug ?? doc.titulo ?? doc.nombre ?? doc.enunciado;
  const t = typeof nombre === "string" ? nombre : "";
  return `${t.length > 50 ? `${t.slice(0, 50)}…` : t} (${texto(doc._id)})`.trim();
}

function ordenarClaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenarClaves);
  if (valor && typeof valor === "object" && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map((k) => [k, ordenarClaves((valor as Record<string, unknown>)[k])]),
    );
  }
  return valor;
}

/** Texto canónico (con los tipos exactos y las claves ordenadas) para comparar */
export function canonico(valor: unknown): string {
  return EJSON.stringify(ordenarClaves(valor), { relaxed: false });
}

/** Huella de una ficha del JSON (sin el id). Solo se guarda como recuerdo; no decide nada. */
export function huella(doc: Doc): string {
  const copia: Record<string, unknown> = { ...doc };
  delete copia._id;
  return createHash("sha256").update(canonico(copia)).digest("hex");
}

// ─── Fotos ───────────────────────────────────────────────────────────────

/** Fotos subidas desde el panel en local (carpeta subidas/, fuera de git) */
export const PREFIJO_SUBIDAS = "/subidas/";
/** Dónde quedan en el repositorio: public/images/catalogo/… */
export const PREFIJO_CATALOGO = "/images/catalogo/";

/** Ruta de una foto en el JSON exportado: las subidas pasan a /images/catalogo/ (van en git) */
export function rutaImagenExportada(ruta: string): string {
  return ruta.startsWith(PREFIJO_SUBIDAS)
    ? PREFIJO_CATALOGO + ruta.slice(PREFIJO_SUBIDAS.length)
    : ruta;
}

// ─── Comprobación del JSON ───────────────────────────────────────────────

/** Errores del catálogo exportado (referencias rotas, únicos repetidos…). Vacío = correcto. */
export function revisarCatalogo(catalogo: Catalogo): string[] {
  const errores: string[] = [];
  const ids = Object.fromEntries(
    COLECCIONES_CATALOGO.map((c) => [c, new Set((catalogo[c] ?? []).map((d) => texto(d._id)))]),
  ) as Record<ColeccionCatalogo, Set<string>>;
  for (const coleccion of COLECCIONES_CATALOGO) {
    const docs = catalogo[coleccion];
    if (!Array.isArray(docs)) {
      errores.push(`${coleccion}: falta el archivo o no es una lista`);
      continue;
    }
    for (const doc of docs) {
      if (!doc?._id || doc._id._bsontype !== "ObjectId") {
        errores.push(`${coleccion}: una ficha no tiene un _id válido`);
        continue;
      }
      for (const [campo, destino] of Object.entries(REFERENCIAS[coleccion])) {
        if (!ids[destino].has(texto(doc[campo]))) {
          errores.push(
            `${coleccion} ${nombreDoc(doc)}: ${campo} apunta a un ${destino} que no está en el JSON`,
          );
        }
      }
    }
    for (const campos of UNICOS[coleccion]) {
      const vistos = new Set<string>();
      for (const doc of docs) {
        const clave = campos.map((c) => texto(doc[c])).join("|");
        if (vistos.has(clave))
          errores.push(`${coleccion}: ${campos.join(" + ")} repetido (${clave})`);
        vistos.add(clave);
      }
    }
  }
  return errores;
}

// ─── Plan de seed:prod ───────────────────────────────────────────────────

/** Lo que seed:prod recuerda de cada ficha que aplicó */
export interface Aplicado {
  /** "Coleccion:idDelJSON" */
  _id: string;
  coleccion: string;
  /** Id de la ficha en producción (casi siempre el mismo del JSON) */
  prodId: ObjectId;
  hash: string;
}

/** crear = ficha nueva en el catálogo; registrar = ya existía: solo se apunta en CatalogoAplicado */
export type TipoOperacion = "crear" | "registrar";

export interface Operacion {
  coleccion: ColeccionCatalogo;
  tipo: TipoOperacion;
  /** Documento que se crea (para "registrar" no se escribe) */
  doc: Doc;
  /** Lo que se guarda en CatalogoAplicado */
  aplicado: Aplicado;
}

export interface ResumenColeccion {
  crear: number;
  /** Ya estaban en producción: se dejan tal cual */
  existentes: number;
  omitidos: number;
}

export interface PlanSemilla {
  operaciones: Operacion[];
  resumen: Record<ColeccionCatalogo, ResumenColeccion>;
  /** Fichas del JSON que no se aplican, y por qué (no es un error) */
  omitidos: string[];
  /** Problemas que impiden escribir (seed:prod se para sin tocar nada) */
  conflictos: string[];
}

/** Clave natural de una ficha (con las referencias ya traducidas a ids de producción) */
function claveNatural(coleccion: ColeccionCatalogo, doc: Doc): string {
  return CLAVE_NATURAL[coleccion].map((c) => texto(doc[c])).join("|");
}

/**
 * Decide qué hacer con cada ficha del JSON frente a lo que ya hay en producción.
 * "aplicados" = lo que seed:prod guardó en CatalogoAplicado en ejecuciones anteriores.
 */
export function planificarSemilla(
  json: Catalogo,
  prod: Catalogo,
  aplicados: Aplicado[],
): PlanSemilla {
  const memoria = new Map(aplicados.map((a) => [a._id, a]));
  /** "Coleccion:idJSON" → id en producción */
  const traduccion = new Map<string, ObjectId>();
  const operaciones: Operacion[] = [];
  const omitidos: string[] = [];
  const conflictos: string[] = [];
  const resumen = Object.fromEntries(
    COLECCIONES_CATALOGO.map((c) => [c, { crear: 0, existentes: 0, omitidos: 0 }]),
  ) as Record<ColeccionCatalogo, ResumenColeccion>;
  /** "Coleccion:idJSON" de las fichas que se crean en esta ejecución */
  const nuevas = new Set<string>();

  for (const coleccion of COLECCIONES_CATALOGO) {
    const enProd = new Map(prod[coleccion].map((d) => [texto(d._id), d]));
    const porClave = new Map(prod[coleccion].map((d) => [claveNatural(coleccion, d), d]));
    /** Fichas de producción ya emparejadas con una del JSON (no se puede usar dos veces) */
    const usadas = new Set<string>();
    /** Estado final de la colección (producción + lo creado) para comprobar los únicos */
    const final = new Map(enProd);

    for (const original of json[coleccion]) {
      const nombre = nombreDoc(original);
      const omitir = (motivo: string) => {
        omitidos.push(`${coleccion} ${nombre}: ${motivo}`);
        resumen[coleccion].omitidos++;
      };

      // 1. Referencias traducidas a los ids de producción
      const doc: Doc = { ...original };
      let padreQueFalta = "";
      for (const [campo, destino] of Object.entries(REFERENCIAS[coleccion])) {
        const id = traduccion.get(`${destino}:${texto(original[campo])}`);
        if (id) doc[campo] = id;
        else padreQueFalta = destino;
      }
      if (padreQueFalta) {
        omitir(`su ${padreQueFalta} no está en producción`);
        continue;
      }

      const clave = `${coleccion}:${texto(original._id)}`;
      const recuerdo = memoria.get(clave);

      // 2. ¿Ya existe en producción?
      let actual: Doc | undefined;
      if (recuerdo) {
        actual = enProd.get(texto(recuerdo.prodId));
        if (!actual) {
          omitir(
            "estuvo en producción y ya no está (borrada desde el panel): no se vuelve a crear",
          );
          continue;
        }
      } else {
        actual = enProd.get(texto(original._id));
        if (!actual) {
          const candidata = porClave.get(claveNatural(coleccion, doc));
          if (
            candidata &&
            !usadas.has(texto(candidata._id)) &&
            !json[coleccion].some((d) => texto(d._id) === texto(candidata._id))
          ) {
            actual = candidata;
          }
        }
      }

      // 3. Ya existe: se deja tal cual (solo se recuerda, por si luego se borra desde el panel)
      if (actual) {
        traduccion.set(clave, actual._id);
        usadas.add(texto(actual._id));
        resumen[coleccion].existentes++;
        if (!recuerdo) {
          const aplicado: Aplicado = {
            _id: clave,
            coleccion,
            prodId: actual._id,
            hash: huella(original),
          };
          operaciones.push({ coleccion, tipo: "registrar", doc: actual, aplicado });
        }
        continue;
      }

      // 4. No existe. Si es parte de un kit, curso o lección que ya existía, no se añade (sería modificarlo)
      const campoDuena = DUENA[coleccion];
      if (campoDuena) {
        const destino = REFERENCIAS[coleccion][campoDuena];
        if (!nuevas.has(`${destino}:${texto(original[campoDuena])}`)) {
          omitir(`su ${destino} ya existe en producción y no se modifica`);
          continue;
        }
      }

      traduccion.set(clave, original._id);
      nuevas.add(clave);
      const aplicado: Aplicado = {
        _id: clave,
        coleccion,
        prodId: original._id,
        hash: huella(original),
      };
      operaciones.push({ coleccion, tipo: "crear", doc, aplicado });
      resumen[coleccion].crear++;
      final.set(texto(original._id), doc);
    }

    // 5. Únicos: lo nuevo no puede chocar con lo que ya hay en producción
    for (const campos of UNICOS[coleccion]) {
      const vistos = new Map<string, Doc>();
      for (const doc of final.values()) {
        const valor = campos.map((c) => texto(doc[c])).join("|");
        const otro = vistos.get(valor);
        if (otro) {
          conflictos.push(
            `${coleccion}: ${nombreDoc(doc)} y ${nombreDoc(otro)} tendrían el mismo ${campos.join(" + ")}. ` +
              "Cambia el slug en el panel de producción o en local (y vuelve a exportar).",
          );
        } else vistos.set(valor, doc);
      }
    }
  }

  return { operaciones, resumen, omitidos, conflictos };
}
