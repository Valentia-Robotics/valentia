import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  huella,
  planificarSemilla,
  revisarCatalogo,
  rutaImagenExportada,
  type Aplicado,
  type Catalogo,
  type Doc,
  type PlanSemilla,
} from "./catalogoProduccion";

const vacio = (): Catalogo => ({
  Componente: [],
  Curso: [],
  Kit: [],
  KitComponente: [],
  Leccion: [],
  Ejercicio: [],
});

/** Un catálogo pequeño y coherente (ids nuevos en cada llamada) */
function catalogo(): Catalogo {
  const curso: Doc = { _id: new ObjectId(), slug: "coche", titulo: "Curso coche" };
  const leccion: Doc = { _id: new ObjectId(), cursoId: curso._id, slug: "intro", orden: 1 };
  const ejercicio: Doc = { _id: new ObjectId(), leccionId: leccion._id, orden: 1, correcta: 0 };
  const motor: Doc = { _id: new ObjectId(), slug: "motor", precioCentimos: 500, stock: 10 };
  const kit: Doc = { _id: new ObjectId(), slug: "kit-coche", cursoId: curso._id };
  const pieza: Doc = { _id: new ObjectId(), kitId: kit._id, componenteId: motor._id, cantidad: 2 };
  return {
    Componente: [motor],
    Curso: [curso],
    Kit: [kit],
    KitComponente: [pieza],
    Leccion: [leccion],
    Ejercicio: [ejercicio],
  };
}

/** Simula lo que haría seed:prod al escribir: devuelve producción y la memoria tras aplicar el plan */
function aplicar(prod: Catalogo, memoria: Aplicado[], plan: PlanSemilla) {
  const nuevo = structuredClone(prod);
  const recuerdos = new Map(memoria.map((a) => [a._id, a]));
  for (const op of plan.operaciones) {
    const lista = nuevo[op.coleccion];
    const i = lista.findIndex((d) => String(d._id) === String(op.doc._id));
    if (op.tipo === "crear") lista.push(op.doc);
    if (op.tipo === "actualizar") lista[i] = op.doc;
    recuerdos.set(op.aplicado._id, op.aplicado);
  }
  return { prod: nuevo, memoria: [...recuerdos.values()] };
}

const totales = (plan: PlanSemilla, campo: "crear" | "actualizar" | "sinCambios" | "omitidos") =>
  Object.values(plan.resumen).reduce((t, r) => t + r[campo], 0);

describe("revisarCatalogo", () => {
  it("un catálogo coherente no tiene errores", () => {
    expect(revisarCatalogo(catalogo())).toEqual([]);
  });

  it("detecta referencias rotas y slugs repetidos", () => {
    const c = catalogo();
    c.Kit[0].cursoId = new ObjectId();
    c.Componente.push({ ...c.Componente[0], _id: new ObjectId() });
    const errores = revisarCatalogo(c);
    expect(errores.some((e) => e.includes("cursoId"))).toBe(true);
    expect(errores.some((e) => e.includes("slug repetido"))).toBe(true);
  });
});

describe("fotos", () => {
  it("las subidas pasan a /images/catalogo/", () => {
    expect(rutaImagenExportada("/subidas/kits/a.webp")).toBe("/images/catalogo/kits/a.webp");
    expect(rutaImagenExportada("/images/kits/a.svg")).toBe("/images/kits/a.svg");
  });
});

describe("planificarSemilla", () => {
  it("producción vacía: crea todo con los mismos ids; la segunda vez no hace nada", () => {
    const json = catalogo();
    const plan = planificarSemilla(json, vacio(), []);
    expect(totales(plan, "crear")).toBe(6);
    expect(plan.operaciones[0].doc._id).toBe(json.Componente[0]._id);
    const despues = aplicar(vacio(), [], plan);
    const otraVez = planificarSemilla(json, despues.prod, despues.memoria);
    expect(otraVez.operaciones).toEqual([]);
    expect(totales(otraVez, "sinCambios")).toBe(6);
  });

  it("no pisa lo editado en el panel si el JSON no ha cambiado", () => {
    const json = catalogo();
    const { prod, memoria } = aplicar(vacio(), [], planificarSemilla(json, vacio(), []));
    prod.Componente[0].precioCentimos = 999; // cambiado en el panel de producción
    expect(planificarSemilla(json, prod, memoria).operaciones).toEqual([]);
  });

  it("actualiza si cambia en el JSON, pero nunca toca el stock", () => {
    const json = catalogo();
    const { prod, memoria } = aplicar(vacio(), [], planificarSemilla(json, vacio(), []));
    prod.Componente[0].stock = 3; // se han vendido 7
    json.Componente[0].precioCentimos = 650;
    json.Componente[0].stock = 50;
    const plan = planificarSemilla(json, prod, memoria);
    expect(plan.operaciones).toHaveLength(1);
    expect(plan.operaciones[0].tipo).toBe("actualizar");
    expect(plan.operaciones[0].doc).toMatchObject({ precioCentimos: 650, stock: 3 });
  });

  it("un cambio solo de stock en el JSON no actualiza nada", () => {
    const json = catalogo();
    const sinStock = huella("Componente", json.Componente[0]);
    expect(huella("Componente", { ...json.Componente[0], stock: 99 })).toBe(sinStock);
  });

  it("nunca borra lo que no está en el JSON", () => {
    const json = catalogo();
    const prod = vacio();
    prod.Componente.push({ _id: new ObjectId(), slug: "creado-en-el-panel" });
    const plan = planificarSemilla(json, prod, []);
    expect(plan.operaciones.every((op) => op.tipo === "crear")).toBe(true);
    expect(aplicar(prod, [], plan).prod.Componente).toHaveLength(2);
  });

  it("no vuelve a crear lo borrado desde el panel (ni lo que cuelga de ello)", () => {
    const json = catalogo();
    const { prod, memoria } = aplicar(vacio(), [], planificarSemilla(json, vacio(), []));
    prod.Kit = [];
    prod.KitComponente = [];
    const plan = planificarSemilla(json, prod, memoria);
    expect(plan.operaciones).toEqual([]);
    expect(plan.omitidos).toHaveLength(2); // el kit y su pieza
  });

  it("reconoce por slug lo cargado con otro id (db:catalogo) y no duplica", () => {
    const json = catalogo();
    const prod = catalogo(); // mismo contenido, otros ids
    prod.Componente[0].precioCentimos = 400;
    const plan = planificarSemilla(json, prod, []);
    expect(totales(plan, "crear")).toBe(0);
    expect(plan.resumen.Componente.actualizar).toBe(1);
    // Las referencias apuntan a los ids de producción
    const pieza = plan.operaciones.find((op) => op.coleccion === "KitComponente")!.doc;
    expect(pieza.kitId).toBe(prod.Kit[0]._id);
    expect(pieza.componenteId).toBe(prod.Componente[0]._id);
    expect(plan.conflictos).toEqual([]);
  });

  it("conflicto si un kit nuevo usaría un curso que ya tiene otro kit en producción", () => {
    const json = catalogo();
    const prod = vacio();
    prod.Curso.push({ ...json.Curso[0] });
    prod.Kit.push({ _id: new ObjectId(), slug: "kit-del-panel", cursoId: json.Curso[0]._id });
    const plan = planificarSemilla(json, prod, []);
    expect(plan.conflictos.some((c) => c.startsWith("Kit:") && c.includes("cursoId"))).toBe(true);
  });
});
