/**
 * CREAR (O ASCENDER) EL ADMINISTRADOR — pensado para la Shell de Render
 * Pide un email:
 *   - si ya hay una cuenta VERIFICADA con ese email, la convierte en ADMIN sin tocar su contraseña;
 *   - si no, pide nombre y contraseña (oculta, dos veces) y crea la cuenta como ADMIN con el email
 *     ya verificado y la contraseña cifrada igual que en el registro (bcrypt, 10 rondas).
 *     Un registro a medias (sin verificar) con ese email se rehace así: nunca se asciende tal cual.
 * La contraseña nunca se muestra ni se guarda en ningún archivo.
 *
 * Uso:  npm run prod:admin
 */
import bcrypt from "bcryptjs";
import { crearClienteScripts } from "../prisma/catalogo";
import { esquemaRegistro } from "../src/lib/validaciones/cuenta";
import { DIAS_CONFIANZA } from "../src/lib/verificacion/reglas";
import { preguntar, preguntarOculto } from "./consola";

// Usa DATABASE_URL (en Render, la del servicio)
const db = crearClienteScripts();

/** Primer mensaje de error de Zod para un campo */
function errorDe(resultado: ReturnType<typeof esquemaRegistro.safeParse>, campo: string) {
  return resultado.error?.issues.find((i) => i.path[0] === campo)?.message;
}

async function main() {
  console.log("Crear o ascender el administrador de Valentia\n");

  const email = (await preguntar("Email: ")).toLowerCase();
  const emailValido = esquemaRegistro.safeParse({
    nombre: "Nombre",
    email,
    contrasena: "12345678",
  });
  const errorEmail = errorDe(emailValido, "email");
  if (errorEmail) throw new Error(errorEmail);

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente?.emailVerificadoEn) {
    if (existente.rol === "ADMIN") {
      console.log(`✔ ${existente.nombre} (${email}) ya era administrador. No se ha cambiado nada.`);
      return;
    }
    await db.usuario.update({ where: { email }, data: { rol: "ADMIN" } });
    // Los ADMIN confirman su dispositivo cada 7 días (ver src/lib/verificacion/reglas.ts)
    const limite = DIAS_CONFIANZA.ADMIN * 24 * 60 * 60_000;
    for (const d of await db.dispositivoConfianza.findMany({
      where: { usuarioId: existente.id },
    })) {
      const maximo = new Date(d.creadoEn.getTime() + limite);
      if (d.caducaEn > maximo) {
        await db.dispositivoConfianza.update({ where: { id: d.id }, data: { caducaEn: maximo } });
      }
    }
    console.log(
      `✔ ${existente.nombre} (${email}) ahora es administrador. Su contraseña no ha cambiado.`,
    );
    return;
  }

  // Registro a medias: nadie ha demostrado que ese email sea suyo y su contraseña la pudo poner
  // cualquiera. No se asciende tal cual: se rehace con el nombre y la contraseña de ahora.
  console.log(
    existente
      ? "Hay una cuenta con ese email, pero nunca confirmó su email (registro a medias).\n" +
          "No se asciende tal cual: se rehace con el nombre y la contraseña que escribas ahora."
      : "No hay ninguna cuenta con ese email: se crea una nueva.",
  );
  const nombre = await preguntar("Nombre: ");
  const contrasena = await preguntarOculto("Contraseña (mínimo 8 caracteres; no se verá): ");
  const repetida = await preguntarOculto("Repite la contraseña: ");
  if (contrasena !== repetida)
    throw new Error("Las dos contraseñas no coinciden. No se ha creado nada.");

  const datos = esquemaRegistro.safeParse({ nombre, email, contrasena });
  if (!datos.success) {
    throw new Error(errorDe(datos, "nombre") ?? errorDe(datos, "contrasena") ?? "Datos no válidos");
  }
  const cuenta = {
    nombre: datos.data.nombre,
    contrasenaHash: await bcrypt.hash(datos.data.contrasena, 10),
    rol: "ADMIN" as const,
    emailVerificadoEn: new Date(),
  };
  if (existente) {
    // Sus códigos y dispositivos (si los hubiera) dejan de valer
    await db.verificacion.deleteMany({ where: { usuarioId: existente.id } });
    await db.dispositivoConfianza.deleteMany({ where: { usuarioId: existente.id } });
    await db.usuario.update({ where: { id: existente.id }, data: cuenta });
  } else {
    await db.usuario.create({ data: { ...cuenta, email: datos.data.email } });
  }
  console.log(
    `✔ Cuenta de administrador creada para ${datos.data.nombre} (${email}).\n` +
      "  Entra en /login: la primera vez en cada navegador te pedirá un código por correo.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
