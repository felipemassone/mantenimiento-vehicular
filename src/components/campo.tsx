import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  etiqueta: string;
  nombre: string;
  tipo?: string;
  ayuda?: string;
  error?: string;
  valorInicial?: string;
  sufijo?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
};

/** Etiqueta arriba, campo de 48 px, ayuda o error debajo (DESIGN.md, Components). */
export function Campo({ id, etiqueta, nombre, tipo = "text", ayuda, error, valorInicial, sufijo, autoComplete, inputMode }: Props) {
  const idAyuda = `${id}-ayuda`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={nombre}
          type={tipo}
          defaultValue={valorInicial}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? idAyuda : undefined}
          className={cn(
            "h-12 bg-card text-base",
            sufijo && "pr-12",
            error && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {sufijo && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {sufijo}
          </span>
        )}
      </div>
      {error ? (
        <p id={idAyuda} className="text-[13px] text-destructive">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={idAyuda} className="text-[13px] text-muted-foreground">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}
