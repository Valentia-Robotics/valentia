"use server";

import { revalidatePath } from "next/cache";
import { borrarCorreosGuardados } from "@/lib/correo/consola";

/** Vacía la bandeja de correos de prueba (solo funciona en desarrollo) */
export async function vaciarBandeja(): Promise<void> {
  if (process.env.NODE_ENV !== "development") return;
  await borrarCorreosGuardados();
  revalidatePath("/dev/correos");
}
