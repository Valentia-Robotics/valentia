import { Star } from "lucide-react";
import { formatearMedia } from "@/lib/resenas/formato";
import { cn } from "@/lib/utils";

/**
 * Cinco estrellas rellenas según la nota (de 1 a 5, admite decimales: 4,5 → cuatro y media).
 * Los lectores de pantalla leen «4,5 de 5 estrellas».
 */
export function Estrellas({ nota, className }: { nota: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${formatearMedia(nota)} de 5 estrellas`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        // Cuánto se rellena esta estrella: 0 %, 50 % o 100 %
        const relleno = Math.max(0, Math.min(1, Math.round((nota - n + 1) * 2) / 2));
        return (
          <span key={n} className="relative inline-block size-[1em]">
            <Star
              aria-hidden="true"
              className="absolute inset-0 size-full text-linea"
              fill="currentColor"
              strokeWidth={0}
            />
            {relleno > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${relleno * 100}%` }}
              >
                <Star
                  aria-hidden="true"
                  className="size-[1em] text-aviso"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
