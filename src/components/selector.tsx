import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  etiqueta: string;
  nombre: string;
  opciones: { valor: string; texto: string }[];
  valor: string;
  onCambio?: (valor: string) => void;
  ayuda?: string;
  error?: string;
  vacio?: string;
};

/** <select> nativo (mejor en el celular) con el mismo estilo que Campo. */
export function Selector({ id, etiqueta, nombre, opciones, valor, onCambio, ayuda, error, vacio = "Elegí una opción" }: Props) {
  const idAyuda = `${id}-ayuda`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </Label>
      <select
        id={id}
        name={nombre}
        value={valor}
        onChange={(e) => onCambio?.(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? idAyuda : undefined}
        className={cn(
          "h-12 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          error && "border-destructive",
        )}
      >
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
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
