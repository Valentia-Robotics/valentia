import { describe, expect, it } from "vitest";
import {
  TiempoAgotadoError,
  conTiempoLimite,
  explicarErrorBD,
  ocultarSecretos,
  revisarDireccion,
} from "./diagnosticoBD";

const BUENA =
  "mongodb+srv://web:Secreta123@valentia-prod.abcde.mongodb.net/valentia?retryWrites=true&w=majority";

describe("ocultarSecretos", () => {
  it("quita la contraseña y deja el usuario y el host", () => {
    const texto = ocultarSecretos(`Error con ${BUENA}`);
    expect(texto).not.toContain("Secreta123");
    expect(texto).toContain("mongodb+srv://web:***@valentia-prod.abcde.mongodb.net/valentia");
  });
});

describe("revisarDireccion", () => {
  it("acepta una dirección de Atlas completa", () => {
    expect(revisarDireccion(BUENA)).toBeNull();
  });

  it.each([
    [undefined, "sin-direccion"],
    ["", "sin-direccion"],
    ["postgres://u:p@host/db", "direccion-mal-formada"],
    [`"${BUENA}"`, "direccion-mal-formada"],
    ["mongodb+srv://web:<db_password>@x.mongodb.net/valentia", "direccion-mal-formada"],
    ["mongodb+srv://x.mongodb.net/valentia", "direccion-mal-formada"],
    ["mongodb+srv://web:clave@x.mongodb.net/?retryWrites=true", "direccion-mal-formada"],
  ])("rechaza %s", (url, motivo) => {
    const error = revisarDireccion(url);
    expect(error?.motivo).toBe(motivo);
    expect(error?.detalle).not.toContain("clave");
  });
});

describe("explicarErrorBD", () => {
  it.each([
    [
      "Server selection timeout: No available servers. Topology: ReplicaSetNoPrimary … I/O error: received fatal alert: InternalError",
      "conexion-rechazada",
    ],
    ["MongoServerError: bad auth : authentication failed", "credenciales"],
    ["querySrv ENOTFOUND _mongodb._tcp.malo.mongodb.net", "host-no-encontrado"],
    ["MongoServerError: not authorized on valentia to execute command", "sin-permisos"],
    ["P1013: The provided database string is invalid", "direccion-mal-formada"],
  ])("%s → %s", (mensaje, motivo) => {
    expect(explicarErrorBD(new Error(mensaje)).motivo).toBe(motivo);
  });

  it("tiempo agotado", () => {
    expect(explicarErrorBD(new TiempoAgotadoError(10)).motivo).toBe("tiempo-agotado");
  });

  it("nunca deja la contraseña en el detalle", () => {
    expect(explicarErrorBD(new Error(`fallo en ${BUENA}`)).detalle).not.toContain("Secreta123");
  });
});

describe("conTiempoLimite", () => {
  it("corta una promesa que no termina", async () => {
    await expect(conTiempoLimite(new Promise(() => {}), 20)).rejects.toBeInstanceOf(
      TiempoAgotadoError,
    );
  });

  it("devuelve el resultado si llega a tiempo", async () => {
    await expect(conTiempoLimite(Promise.resolve(7), 1000)).resolves.toBe(7);
  });
});
