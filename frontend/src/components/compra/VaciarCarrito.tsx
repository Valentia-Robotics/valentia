"use client";

import { useEffect } from "react";
import { useCarrito } from "@/store/carrito";

/** Vacía el carrito del navegador (al volver de un pago completado) */
export function VaciarCarrito() {
  const vaciar = useCarrito((estado) => estado.vaciar);
  useEffect(() => vaciar(), [vaciar]);
  return null;
}
