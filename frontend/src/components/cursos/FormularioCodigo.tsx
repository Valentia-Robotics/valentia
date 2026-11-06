import { Boton } from "@/components/ui/Boton";

/**
 * Para escribir el código a mano (si el móvil no lee el QR).
 * Es un formulario normal que abre /activar?codigo=…, así que funciona sin iniciar sesión.
 */
export function FormularioCodigo({ valor }: { valor?: string }) {
  return (
    <form action="/activar" method="get" className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="campo-codigo" className="sr-only">
        Código de activación
      </label>
      <input
        id="campo-codigo"
        name="codigo"
        defaultValue={valor}
        required
        placeholder="VAL-XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="h-14 flex-1 rounded-control bg-white px-4 font-mono text-lg tracking-wider uppercase ring-1 ring-linea outline-none placeholder:text-gris-claro focus:ring-2 focus:ring-acento"
      />
      <Boton type="submit" variante="primario" tamano="lg" className="h-14">
        Comprobar
      </Boton>
    </form>
  );
}
