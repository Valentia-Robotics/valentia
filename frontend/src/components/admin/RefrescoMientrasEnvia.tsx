"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Mientras haya un correo enviándose, recarga los números cada 4 segundos */
export function RefrescoMientrasEnvia({ activo }: { activo: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!activo) return;
    const reloj = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(reloj);
  }, [activo, router]);
  return null;
}
