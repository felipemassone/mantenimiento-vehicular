import { Wrench } from "lucide-react";

export function Logo({ subtitulo }: { subtitulo?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary" aria-hidden="true">
        <Wrench className="size-[18px] text-oro" strokeWidth={2.25} />
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold">Libreta de service</span>
        {subtitulo && <span className="block text-[13px] text-muted-foreground">{subtitulo}</span>}
      </span>
    </div>
  );
}
