/** Mientras se prepara una página del panel */
export default function Cargar() {
  return (
    <div role="status" className="animate-pulse space-y-4 motion-reduce:animate-none">
      <span className="sr-only">Cargando…</span>
      <div className="h-8 w-48 rounded-md bg-linea/60" />
      <div className="h-64 rounded-lg bg-white ring-1 ring-linea" />
    </div>
  );
}
