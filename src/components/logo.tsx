/** Isotipo A de Km 12 (docs/diseno/stitch_km_12_logo_design_system): mojón de ruta con el "12". */
function Mojon() {
  return (
    <svg viewBox="0 0 76 114" className="h-8 w-auto shrink-0" aria-hidden="true">
      <path d="M0 114V38C0 17.0132 17.0132 0 38 0C58.9868 0 76 17.0132 76 38V114H0Z" className="fill-primary" />
      <rect x="34" y="10" width="8" height="16" rx="4" className="fill-oro" />
      <text
        x="38"
        y="84"
        textAnchor="middle"
        letterSpacing="-0.03em"
        className="fill-primary-foreground font-sans text-[40px] font-bold tabular-nums"
      >
        12
      </text>
    </svg>
  );
}

export function Logo({ subtitulo }: { subtitulo?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Mojon />
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold">Km 12</span>
        {subtitulo && <span className="block text-[13px] text-muted-foreground">{subtitulo}</span>}
      </span>
    </div>
  );
}
