/**
 * Reglas de validación (con Zod) para el checkout: los datos del cliente
 * y el contenido del carrito que llega desde el navegador.
 * Ojo: el carrito NO trae precios de confianza; el servidor los recalcula.
 */
import { z } from "zod";
import { tienda } from "@/config/tienda";
import { codigoPostalEnZona } from "@/lib/precios";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Producto no válido");
const cantidad = z.number().int().min(1).max(99);

export const esquemaArticuloPedido = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("kit"), slug, cantidad }),
  z.object({ tipo: z.literal("componente"), slug, cantidad }),
  z.object({
    tipo: z.literal("configuracion"),
    nombre: z.string().trim().min(1).max(100),
    piezas: z.array(z.object({ slug, cantidad })).min(1).max(40),
    cantidad,
  }),
]);

export const esquemaCarritoPedido = z
  .array(esquemaArticuloPedido)
  .min(1, "Tu carrito está vacío")
  .max(50, "Hay demasiados artículos en el carrito");

export const esquemaDatosCliente = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre y apellidos")
    .max(100, "El nombre es demasiado largo"),
  email: z.string().trim().toLowerCase().pipe(z.email("Revisa el email: parece que falta algo")),
  direccion: z
    .string()
    .trim()
    .min(5, "Escribe la calle y el número")
    .max(200, "La dirección es demasiado larga"),
  codigoPostal: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "El código postal tiene 5 cifras")
    .refine(
      codigoPostalEnZona,
      `¡Vaya! De momento solo enviamos a la ${tienda.envio.nombreZona} (códigos postales que empiezan por ${tienda.envio.provincias.map((p) => p.prefijoCP).join(", ")}). Pronto llegaremos a más sitios.`,
    ),
  ciudad: z.string().trim().min(2, "Escribe tu ciudad").max(100, "El nombre es demasiado largo"),
});

export type ArticuloPedido = z.infer<typeof esquemaArticuloPedido>;
export type DatosCliente = z.infer<typeof esquemaDatosCliente>;
