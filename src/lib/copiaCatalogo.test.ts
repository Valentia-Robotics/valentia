import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  adaptarImagenes,
  planificarCopia,
  rutaImagenProduccion,
  type Catalogo,
  type Doc,
  type UsoEnProduccion,
} from "./copiaCatalogo";

const id = () => new ObjectId();
const vacio = (): Catalogo => ({
  Componente: [],
  Curso: [],
  Kit: [],
  KitComponente: [],
  Leccion: [],
  Ejercicio: [],
});
const sinUso = (): UsoEnProduccion => ({
  kitsConCodigos: new Set(),
  cursosConAlumnos: new Set(),
  leccionesConProgreso: new Set(),
  ejerciciosConProgreso: new Set(),
  slugsEnPedidos: new Set(),
});

/** Un catálogo pequeño: un curso con una lección y un ejercicio, un kit con un componente */
function catalogo() {
  const curso: Doc = { _id: id(), slug: "coche", titulo: "Curso coche" };
  const leccion: Doc = { _id: id(), cursoId: curso._id, slug: "intro", orden: 1 };
  const ejercicio: Doc = { _id: id(), leccionId: leccion._id, orden: 1, correcta: null };
  const componente: Doc = {
    _id: id(),
    slug: "motor",
    imagen: "/images/componentes/motor.svg",
    precioCentimos: 500,
  };
  const kit: Doc = {
    _id: id(),
    slug: "kit-coche",
    cursoId: curso._id,
    imagen: "/subidas/kits/coche.webp",
  };
  const kc: Doc = { _id: id(), kitId: kit._id, componenteId: componente._id, cantidad: 2 };
  const c = vacio();
  c.Curso.push(curso);
  c.Leccion.push(leccion);
  c.Ejercicio.push(ejercicio);
  c.Componente.push(componente);
  c.Kit.push(kit);
  c.KitComponente.push(kc);
  return { c, curso, leccion, ejercicio, componente, kit, kc };
}

describe("imágenes", () => {
  it("las subidas pasan a /images/catalogo/ y el resto no cambia", () => {
    expect(rutaImagenProduccion("/subidas/kits/a.webp")).toBe("/images/catalogo/kits/a.webp");
    expect(rutaImagenProduccion("/images/kits/a.svg")).toBe("/images/kits/a.svg");
    expect(rutaImagenProduccion("https://fotos.x.es/a.webp")).toBe("https://fotos.x.es/a.webp");
  });

  it("adaptarImagenes cambia la foto de kits y componentes", () => {
    const { c } = catalogo();
    expect(adaptarImagenes(c).Kit[0].imagen).toBe("/images/catalogo/kits/coche.webp");
  });
});

describe("planificarCopia", () => {
  it("producción vacía: crea todo", () => {
    const { c } = catalogo();
    const plan = planificarCopia(c, vacio(), sinUso());
    expect(plan.colecciones.Kit.crear).toHaveLength(1);
    expect(plan.colecciones.Ejercicio.crear).toHaveLength(1);
    expect(plan.conflictos).toEqual([]);
  });

  it("detecta iguales (aunque cambie el orden de los campos), cambios y sobrantes", () => {
    const { c, componente, kit } = catalogo();
    const destino = vacio();
    destino.Componente.push({
      precioCentimos: 500,
      slug: "motor",
      imagen: componente.imagen,
      _id: componente._id,
    });
    destino.Kit.push({ ...kit, imagen: "/images/kits/viejo.svg" });
    const sobra: Doc = { _id: id(), slug: "pieza-vieja" };
    destino.Componente.push(sobra);
    const plan = planificarCopia(c, destino, sinUso());
    expect(plan.colecciones.Componente.iguales).toBe(1);
    expect(plan.colecciones.Kit.actualizar).toHaveLength(1);
    expect(plan.colecciones.Componente.borrar).toEqual([sobra]);
  });

  it("no borra un producto que sale en pedidos si deja de existir su slug", () => {
    const { c } = catalogo();
    const destino = vacio();
    const vendido: Doc = { _id: id(), slug: "sensor-viejo" };
    destino.Componente.push(vendido);
    const uso = sinUso();
    uso.slugsEnPedidos.add("sensor-viejo");
    const plan = planificarCopia(c, destino, uso);
    expect(plan.colecciones.Componente.borrar).toEqual([]);
    expect(plan.colecciones.Componente.conservar[0].motivo).toMatch(/pedidos/);
  });

  it("sí sustituye un producto de un pedido si en local existe con el mismo slug (otro id)", () => {
    const { c } = catalogo();
    const destino = vacio();
    const antiguo: Doc = { _id: id(), slug: "motor" };
    destino.Componente.push(antiguo);
    const uso = sinUso();
    uso.slugsEnPedidos.add("motor");
    const plan = planificarCopia(c, destino, uso);
    expect(plan.colecciones.Componente.borrar).toEqual([antiguo]);
    expect(plan.conflictos).toEqual([]);
  });

  it("un kit con códigos se conserva con su curso, lecciones, ejercicios y piezas", () => {
    const destino = catalogo(); // otro catálogo con otros ids (como el cargado con db:catalogo)
    for (const doc of [...destino.c.Kit, ...destino.c.Curso, ...destino.c.Componente])
      doc.slug += "-prod";
    const uso = sinUso();
    uso.kitsConCodigos.add(String(destino.kit._id));
    const plan = planificarCopia(catalogo().c, destino.c, uso);
    for (const nombre of [
      "Kit",
      "Curso",
      "Leccion",
      "Ejercicio",
      "KitComponente",
      "Componente",
    ] as const) {
      expect(plan.colecciones[nombre].borrar, nombre).toEqual([]);
      expect(plan.colecciones[nombre].conservar, nombre).toHaveLength(1);
    }
    expect(plan.conflictos).toEqual([]);
  });

  it("conflicto si lo conservado tiene el mismo slug que lo nuevo", () => {
    const destino = catalogo();
    const uso = sinUso();
    uso.kitsConCodigos.add(String(destino.kit._id));
    const plan = planificarCopia(catalogo().c, destino.c, uso);
    expect(plan.conflictos.some((t) => t.startsWith("Kit:") && t.includes("slug"))).toBe(true);
    expect(plan.conflictos.some((t) => t.startsWith("Curso:"))).toBe(true);
  });

  it("una lección con progreso conserva su curso", () => {
    const destino = catalogo();
    destino.curso.slug = "curso-viejo";
    destino.kit.slug = "kit-viejo";
    destino.componente.slug = "motor-viejo";
    const uso = sinUso();
    uso.leccionesConProgreso.add(String(destino.leccion._id));
    const plan = planificarCopia(catalogo().c, destino.c, uso);
    expect(plan.colecciones.Curso.conservar).toHaveLength(1);
    expect(plan.colecciones.Kit.borrar).toHaveLength(1); // el kit no tiene códigos: se borra
    expect(plan.conflictos).toEqual([]);
  });
});
