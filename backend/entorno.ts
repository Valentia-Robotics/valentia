/**
 * Carga las variables en tu ordenador: backend/.env si existe y, si no, las de frontend/.env.
 * Va en su propio archivo porque tiene que ejecutarse antes de abrir la base de datos.
 * En Render las variables vienen de su panel y aquí no se pisa nada.
 */
import { config } from "dotenv";

config({ path: [".env", "../frontend/.env"], quiet: true });
