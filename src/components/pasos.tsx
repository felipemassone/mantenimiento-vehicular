const PASOS = ["Tu auto", "Lo que ya se hizo", "Tu ficha"] as const;

/** Primer auto guiado (spec 2026-10-16, apartado 3): en qué paso está, de los tres. */
export function Pasos({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <div className="mb-4">
      <p className="text-[13px] text-muted-foreground">
        Paso {actual} de {PASOS.length} · {PASOS[actual - 1]}
      </p>
      <ol className="mt-2 flex gap-1.5" aria-hidden="true">
        {PASOS.map((p, i) => (
          <li key={p} className={`h-1 flex-1 rounded-full ${i < actual ? "bg-primary" : "bg-border"}`} />
        ))}
      </ol>
    </div>
  );
}
