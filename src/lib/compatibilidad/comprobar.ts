/**
 * MOTOR DE COMPATIBILIDAD
 * Recibe las piezas del robot, recorre las reglas de reglas.ts y devuelve
 * los avisos que hay que mostrar. No sabe nada de motores ni de placas:
 * todo lo que sabe está en las reglas.
 */
import { formatearNumero } from "@/lib/utils";
import type { ComponenteCatalogo } from "@/types/catalogo";
import { reglas as reglasPorDefecto } from "./reglas";
import type {
  Aviso,
  Diagnostico,
  Medidor,
  Nivel,
  PiezaConDatos,
  Regla,
  ReglaCapacidad,
  ReglaMaximo,
  ReglaNecesita,
  ReglaVoltaje,
  Selector,
} from "./tipos";

/** ¿Esta pieza encaja en el selector? */
export function coincide(componente: Pick<ComponenteCatalogo, "tipo" | "categoria">, s: Selector) {
  if (s.excepto?.includes(componente.tipo)) return false;
  if (s.tipos && !s.tipos.includes(componente.tipo)) return false;
  if (s.categorias && !s.categorias.includes(componente.categoria)) return false;
  return true;
}

/** Rellena los huecos {asi} de un texto con los valores indicados */
function rellenar(texto: string, valores: Record<string, string | number>): string {
  return texto.replace(/\{(\w+)\}/g, (hueco, clave: string) =>
    clave in valores ? String(valores[clave]) : hueco,
  );
}

/** Une nombres a la española: "A", "A y B", "A, B y C" */
function listaNombres(piezas: PiezaConDatos[]): string {
  const nombres = piezas.map((p) => p.componente.nombre);
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

const contar = (piezas: PiezaConDatos[]) => piezas.reduce((total, p) => total + p.cantidad, 0);

/* ---------- Una función por cada tipo de regla ---------- */

function comprobarNecesita(regla: ReglaNecesita, piezas: PiezaConDatos[]): Aviso | null {
  const conNecesidad = piezas.filter((p) => coincide(p.componente, regla.si));
  if (conNecesidad.length === 0) return null;

  const cantidad = contar(conNecesidad);
  const tienes = contar(piezas.filter((p) => coincide(p.componente, regla.necesita)));
  const necesarias = regla.unoPorCada ? Math.ceil(cantidad / regla.unoPorCada) : 1;
  if (tienes >= necesarias) return null;

  return crearAviso(regla, {
    piezas: listaNombres(conNecesidad),
    cantidad,
    necesarias,
    tienes,
  });
}

function comprobarMaximo(regla: ReglaMaximo, piezas: PiezaConDatos[]): Aviso | null {
  const cantidad = contar(piezas.filter((p) => coincide(p.componente, regla.si)));
  if (cantidad <= regla.maximo) return null;
  return crearAviso(regla, { cantidad, maximo: regla.maximo });
}

function comprobarVoltaje(regla: ReglaVoltaje, piezas: PiezaConDatos[]): Aviso | null {
  // Si hay varias fuentes (por ejemplo, dos baterías), miramos el caso más peligroso:
  // la de más voltios para "exceso" y la de menos para "defecto"
  const fuentes = piezas.filter(
    (p) => coincide(p.componente, regla.fuente) && p.componente[regla.campo] != null,
  );
  if (fuentes.length === 0) return null;
  const fuente = fuentes.reduce((elegida, p) => {
    const v = p.componente[regla.campo] ?? 0;
    const ve = elegida.componente[regla.campo] ?? 0;
    return (regla.caso === "exceso" ? v > ve : v < ve) ? p : elegida;
  });
  const voltajeFuente = fuente.componente[regla.campo] ?? 0;

  const afectadas = piezas.filter((p) => {
    if (p === fuente || !coincide(p.componente, regla.piezas)) return false;
    const voltajePieza = p.componente[regla.campo];
    if (voltajePieza == null || voltajePieza === 0) return false;
    return regla.caso === "exceso"
      ? voltajeFuente > voltajePieza * (1 + regla.margen)
      : voltajeFuente < voltajePieza * (1 - regla.margen);
  });
  if (afectadas.length === 0) return null;

  return crearAviso(regla, {
    piezas: listaNombres(afectadas),
    fuente: fuente.componente.nombre,
    voltajeFuente: formatearNumero(voltajeFuente),
    voltajePieza: formatearNumero(afectadas[0].componente[regla.campo] ?? 0),
  });
}

function comprobarCapacidad(
  regla: ReglaCapacidad,
  piezas: PiezaConDatos[],
): { aviso: Aviso | null; medidor: Medidor | null } {
  const proveedores = piezas.filter((p) => coincide(p.componente, regla.proveedor));
  // Sin placa o sin batería no hay nada que medir (de eso avisan las reglas "necesita")
  if (proveedores.length === 0) return { aviso: null, medidor: null };

  const valores = proveedores.map((p) =>
    regla.combinar === "sumar" ? p.componente[regla.campo] * p.cantidad : p.componente[regla.campo],
  );
  const disponibles =
    regla.combinar === "sumar" ? valores.reduce((a, b) => a + b, 0) : Math.max(...valores);
  const usados = piezas
    .filter((p) => coincide(p.componente, regla.consumidor))
    .reduce((total, p) => total + p.componente[regla.campo] * p.cantidad, 0);

  const medidor: Medidor = {
    id: regla.id,
    etiqueta: regla.etiqueta,
    unidad: regla.unidad,
    usados,
    disponibles,
  };

  const proporcion = disponibles > 0 ? usados / disponibles : Infinity;
  // Los umbrales se miran de mayor a menor: gana el más grave que se cumpla
  const umbral = [...regla.umbrales]
    .sort((a, b) => b.desde - a.desde)
    .find((u) => proporcion >= u.desde);
  if (!umbral) return { aviso: null, medidor };

  return {
    medidor,
    aviso: crearAviso(
      { ...umbral, id: `${regla.id}-${umbral.desde}` },
      {
        usados: formatearNumero(usados),
        disponibles: formatearNumero(disponibles),
        porcentaje: Math.round(proporcion * 100),
        unidad: regla.unidad,
      },
    ),
  };
}

function crearAviso(
  regla: { id: string; nivel: Nivel; titulo: string; mensaje: string; sugerencia?: string },
  valores: Record<string, string | number>,
): Aviso {
  return {
    id: regla.id,
    nivel: regla.nivel,
    titulo: rellenar(regla.titulo, valores),
    mensaje: rellenar(regla.mensaje, valores),
    sugerencia: regla.sugerencia,
  };
}

const gravedad: Record<Nivel, number> = { error: 0, aviso: 1, info: 2 };

/**
 * Comprueba un robot completo.
 * @param piezas las piezas del robot con sus datos
 * @param reglas opcional: otra lista de reglas (por defecto, las de reglas.ts)
 */
export function comprobarRobot(
  piezas: PiezaConDatos[],
  reglas: Regla[] = reglasPorDefecto,
): Diagnostico {
  const avisos: Aviso[] = [];
  const medidores: Medidor[] = [];

  if (piezas.length > 0) {
    for (const regla of reglas) {
      if (regla.tipo === "capacidad") {
        const { aviso, medidor } = comprobarCapacidad(regla, piezas);
        if (aviso) avisos.push(aviso);
        if (medidor) medidores.push(medidor);
        continue;
      }
      const aviso =
        regla.tipo === "necesita"
          ? comprobarNecesita(regla, piezas)
          : regla.tipo === "maximo"
            ? comprobarMaximo(regla, piezas)
            : comprobarVoltaje(regla, piezas);
      if (aviso) avisos.push(aviso);
    }
  }

  // Primero los errores, luego los avisos y al final los consejos
  avisos.sort((a, b) => gravedad[a.nivel] - gravedad[b.nivel]);

  return {
    avisos,
    medidores,
    errores: avisos.filter((a) => a.nivel === "error").length,
    advertencias: avisos.filter((a) => a.nivel === "aviso").length,
  };
}

/**
 * Lo que necesita una pieza para funcionar, para mostrarlo en su ficha.
 * Sale de las reglas "necesita" que tienen el campo "requisito".
 */
export function requisitosDe(
  componente: Pick<ComponenteCatalogo, "tipo" | "categoria">,
  reglas: Regla[] = reglasPorDefecto,
): string[] {
  return reglas.flatMap((r) =>
    r.tipo === "necesita" && r.requisito && coincide(componente, r.si) ? [r.requisito] : [],
  );
}
