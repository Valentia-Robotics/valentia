/**
 * COPIAR EL CATÁLOGO DE DESARROLLO A PRODUCCIÓN (la parte que decide qué hacer)
 * La usa "npm run catalogo:copiar" (scripts/copiar-catalogo.ts). Aquí no se conecta a nada:
 * recibe los documentos de los dos lados y devuelve el plan (crear, actualizar, borrar, conservar).
 *
 * Reglas:
 *   - Solo las 6 colecciones del catálogo. Usuarios, pedidos, códigos y progreso NO se tocan nunca.
 *   - Se copia con los mismos _id, así las relaciones (kit → curso, kit → componentes…) siguen valiendo.
 *   - Lo que sobra en producción se borra, SALVO si lo usan datos de clientes (códigos, pedidos,
 *     alumnos, progreso): entonces se conserva y se avisa.
 *   - Si algo conservado choca con lo nuevo (mismo slug con otro id), el plan lleva un conflicto
 *     y el script no escribe nada.
 */
import { BSON, type ObjectId } from "mongodb";

const { EJSON } = BSON;

/** Colecciones del catálogo, en el orden en que se escriben (primero las que no dependen de otras) */
export const COLECCIONES_CATALOGO = [
  "Componente",
  "Curso",
  "Kit",
  "KitComponente",
  "Leccion",
  "Ejercicio",
] as const;
export type ColeccionCatalogo = (typeof COLECCIONES_CATALOGO)[number];

/** Colecciones que el script nunca escribe (solo lee algunas para no romper sus referencias) */
export const COLECCIONES_PROTEGIDAS = [
  "Usuario",
  "Direccion",
  "DispositivoConfianza",
  "Verificacion",
  "EnvioCodigo",
  "LimiteIntento",
  "Pedido",
  "LineaPedido",
  "EventoStripe",
  "CodigoActivacion",
  "LoteCodigos",
  "CursoUsuario",
  "ProgresoLeccion",
  "ProgresoEjercicio",
  "VideoVisto",
  "ResultadoTest",
] as const;

/** Un documento tal cual sale de MongoDB */
export type Doc = { _id: ObjectId } & Record<string, unknown>;
export type Catalogo = Record<ColeccionCatalogo, Doc[]>;

/** Lo que los datos de clientes de producción usan del catálogo (ids como texto) */
export interface UsoEnProduccion {
  /** kitId de CodigoActivacion y LoteCodigos */
  kitsConCodigos: Set<string>;
  /** cursoId de CursoUsuario */
  cursosConAlumnos: Set<string>;
  /** leccionId de ProgresoLeccion, VideoVisto y ResultadoTest */
  leccionesConProgreso: Set<string>;
  /** ejercicioId de ProgresoEjercicio */
  ejerciciosConProgreso: Set<string>;
  /** slugs de kits y componentes en las líneas de los pedidos (también las piezas de los robots) */
  slugsEnPedidos: Set<string>;
}

export interface Conservado {
  doc: Doc;
  motivo: string;
}

export interface PlanColeccion {
  crear: Doc[];
  actualizar: Doc[];
  borrar: Doc[];
  /** Sobra en producción, pero lo usan datos de clientes: no se borra */
  conservar: Conservado[];
  iguales: number;
}

export interface Plan {
  colecciones: Record<ColeccionCatalogo, PlanColeccion>;
  /** Problemas que impiden escribir (el script se detiene) */
  conflictos: string[];
}

/** Campos únicos de cada colección (los índices @unique / @@unique del esquema) */
const UNICOS: Record<ColeccionCatalogo, string[][]> = {
  Componente: [["slug"]],
  Curso: [["slug"]],
  Kit: [["slug"], ["cursoId"]],
  KitComponente: [["kitId", "componenteId"]],
  Leccion: [["cursoId", "slug"]],
  Ejercicio: [],
};

/** Id (ObjectId o texto) como texto */
export const idTexto = (valor: unknown): string => String(valor);

/** Nombre legible de un documento para los mensajes */
export function nombreDoc(doc: Doc): string {
  const nombre = doc.slug ?? doc.titulo ?? doc.nombre ?? doc.enunciado;
  const texto = typeof nombre === "string" ? nombre : "";
  return `${texto.length > 50 ? `${texto.slice(0, 50)}…` : texto} (${idTexto(doc._id)})`.trim();
}

/** Copia con las claves ordenadas, para comparar sin que importe el orden de los campos */
function ordenarClaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenarClaves);
  if (valor && typeof valor === "object" && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map((clave) => [clave, ordenarClaves((valor as Record<string, unknown>)[clave])]),
    );
  }
  return valor;
}

/** true si los dos documentos tienen exactamente los mismos datos (con sus tipos) */
export function mismosDatos(a: Doc, b: Doc): boolean {
  const canonico = (doc: Doc) => EJSON.stringify(ordenarClaves(doc), { relaxed: false });
  return canonico(a) === canonico(b);
}

// ─── Imágenes ────────────────────────────────────────────────────────────

/** Prefijo de las fotos subidas desde el panel en local (carpeta subidas/, fuera de git) */
export const PREFIJO_SUBIDAS = "/subidas/";
/** Dónde quedan en el repositorio (public/images/catalogo/…) */
export const PREFIJO_CATALOGO = "/images/catalogo/";

/** Ruta de una foto en producción: las subidas pasan a /images/catalogo/ (van en git) */
export function rutaImagenProduccion(ruta: string): string {
  return ruta.startsWith(PREFIJO_SUBIDAS)
    ? PREFIJO_CATALOGO + ruta.slice(PREFIJO_SUBIDAS.length)
    : ruta;
}

/** El catálogo con las rutas de las fotos de producción (Componente y Kit tienen "imagen") */
export function adaptarImagenes(catalogo: Catalogo): Catalogo {
  const adaptar = (docs: Doc[]) =>
    docs.map((doc) =>
      typeof doc.imagen === "string" ? { ...doc, imagen: rutaImagenProduccion(doc.imagen) } : doc,
    );
  return { ...catalogo, Componente: adaptar(catalogo.Componente), Kit: adaptar(catalogo.Kit) };
}

// ─── Plan ────────────────────────────────────────────────────────────────

/**
 * Compara el catálogo de origen (local) con el de destino (producción) y decide qué hacer.
 * "origen" ya debe llevar las rutas de las fotos de producción (adaptarImagenes).
 */
export function planificarCopia(origen: Catalogo, destino: Catalogo, uso: UsoEnProduccion): Plan {
  const colecciones = {} as Record<ColeccionCatalogo, PlanColeccion>;
  /** Por colección: id → doc de producción que sobra (candidato a borrar) */
  const sobran = {} as Record<ColeccionCatalogo, Map<string, Doc>>;

  for (const nombre of COLECCIONES_CATALOGO) {
    const enDestino = new Map(destino[nombre].map((doc) => [idTexto(doc._id), doc]));
    const idsOrigen = new Set(origen[nombre].map((doc) => idTexto(doc._id)));
    const plan: PlanColeccion = {
      crear: [],
      actualizar: [],
      borrar: [],
      conservar: [],
      iguales: 0,
    };
    for (const doc of origen[nombre]) {
      const actual = enDestino.get(idTexto(doc._id));
      if (!actual) plan.crear.push(doc);
      else if (mismosDatos(doc, actual)) plan.iguales++;
      else plan.actualizar.push(doc);
    }
    sobran[nombre] = new Map(
      destino[nombre]
        .filter((doc) => !idsOrigen.has(idTexto(doc._id)))
        .map((doc) => [idTexto(doc._id), doc]),
    );
    colecciones[nombre] = plan;
  }

  // 1. Lo que usan los datos de clientes no se borra
  const conservar = Object.fromEntries(
    COLECCIONES_CATALOGO.map((nombre) => [nombre, new Map<string, string>()]),
  ) as Record<ColeccionCatalogo, Map<string, string>>;
  /** Marca para conservar (si sobra en producción). Devuelve true si es nuevo. */
  const marcar = (nombre: ColeccionCatalogo, id: unknown, motivo: string): boolean => {
    const clave = idTexto(id);
    if (!sobran[nombre].has(clave) || conservar[nombre].has(clave)) return false;
    conservar[nombre].set(clave, motivo);
    return true;
  };
  // Un producto que sigue existiendo con el mismo slug (aunque cambie de id) no rompe los pedidos
  const slugsQueQuedan = new Set(
    [...origen.Kit, ...origen.Componente]
      .map((doc) => doc.slug)
      .filter((s) => typeof s === "string"),
  );

  for (const doc of sobran.Kit.values()) {
    if (uso.kitsConCodigos.has(idTexto(doc._id))) {
      marcar("Kit", doc._id, "tiene códigos de activación o lotes en producción");
    }
  }
  for (const nombre of ["Kit", "Componente"] as const) {
    for (const doc of sobran[nombre].values()) {
      if (
        typeof doc.slug === "string" &&
        uso.slugsEnPedidos.has(doc.slug) &&
        !slugsQueQuedan.has(doc.slug)
      ) {
        marcar(nombre, doc._id, "aparece en pedidos de producción");
      }
    }
  }
  for (const doc of sobran.Curso.values()) {
    if (uso.cursosConAlumnos.has(idTexto(doc._id))) {
      marcar("Curso", doc._id, "tiene alumnos en producción");
    }
  }
  for (const doc of sobran.Leccion.values()) {
    if (uso.leccionesConProgreso.has(idTexto(doc._id))) {
      marcar("Leccion", doc._id, "tiene progreso de alumnos en producción");
    }
  }
  for (const doc of sobran.Ejercicio.values()) {
    if (uso.ejerciciosConProgreso.has(idTexto(doc._id))) {
      marcar("Ejercicio", doc._id, "tiene progreso de alumnos en producción");
    }
  }

  // 2. Lo que se conserva arrastra a lo que necesita (y a sus piezas): un kit conservado
  //    sigue con su curso y sus componentes; un curso conservado, con sus lecciones y ejercicios.
  const conservados = (nombre: ColeccionCatalogo) =>
    [...conservar[nombre].keys()].map((id) => sobran[nombre].get(id)!);
  for (let cambios = true; cambios;) {
    cambios = false;
    for (const kit of conservados("Kit")) {
      cambios =
        marcar("Curso", kit.cursoId, `es el curso del kit conservado ${kit.slug}`) || cambios;
      for (const kc of sobran.KitComponente.values()) {
        if (idTexto(kc.kitId) === idTexto(kit._id)) {
          cambios =
            marcar("KitComponente", kc._id, `pieza del kit conservado ${kit.slug}`) || cambios;
        }
      }
    }
    for (const kc of conservados("KitComponente")) {
      cambios = marcar("Componente", kc.componenteId, "está en un kit conservado") || cambios;
    }
    for (const curso of conservados("Curso")) {
      for (const leccion of sobran.Leccion.values()) {
        if (idTexto(leccion.cursoId) === idTexto(curso._id)) {
          cambios =
            marcar("Leccion", leccion._id, `lección del curso conservado ${curso.slug}`) || cambios;
        }
      }
    }
    for (const leccion of conservados("Leccion")) {
      cambios =
        marcar("Curso", leccion.cursoId, `tiene la lección conservada ${leccion.slug}`) || cambios;
      for (const ejercicio of sobran.Ejercicio.values()) {
        if (idTexto(ejercicio.leccionId) === idTexto(leccion._id)) {
          cambios =
            marcar(
              "Ejercicio",
              ejercicio._id,
              `ejercicio de la lección conservada ${leccion.slug}`,
            ) || cambios;
        }
      }
    }
    for (const ejercicio of conservados("Ejercicio")) {
      cambios = marcar("Leccion", ejercicio.leccionId, "tiene un ejercicio conservado") || cambios;
    }
  }

  // 3. Resultado por colección y conflictos de campos únicos entre lo nuevo y lo conservado
  const conflictos: string[] = [];
  for (const nombre of COLECCIONES_CATALOGO) {
    const plan = colecciones[nombre];
    for (const [id, doc] of sobran[nombre]) {
      const motivo = conservar[nombre].get(id);
      if (motivo) plan.conservar.push({ doc, motivo });
      else plan.borrar.push(doc);
    }
    const final = [...origen[nombre], ...plan.conservar.map((c) => c.doc)];
    for (const campos of UNICOS[nombre]) {
      const vistos = new Map<string, Doc>();
      for (const doc of final) {
        const clave = campos.map((campo) => idTexto(doc[campo])).join(" + ");
        const otro = vistos.get(clave);
        if (otro) {
          conflictos.push(
            `${nombre}: ${nombreDoc(doc)} y ${nombreDoc(otro)} tendrían el mismo ${campos.join(" + ")}. ` +
              "El de producción no se puede borrar (lo usan datos de clientes) y el de local tiene otro id.",
          );
        } else vistos.set(clave, doc);
      }
    }
  }

  return { colecciones, conflictos };
}
