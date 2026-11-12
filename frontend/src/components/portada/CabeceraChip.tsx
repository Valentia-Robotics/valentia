/** Cabecera negra de un chip: referencia en cobre (U1…), nivel y edad. La usan KitsPortada y GaleriaKits */
export function CabeceraChip({
  referencia,
  nivel,
  edadMinima,
}: {
  referencia: number;
  nivel: string;
  edadMinima: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-tinta px-4 py-2.5 font-mono text-[11px] text-white/80">
      <span>
        <span className="text-cobre">U{referencia}</span> · {nivel}
      </span>
      <span>desde {edadMinima} años</span>
    </div>
  );
}
