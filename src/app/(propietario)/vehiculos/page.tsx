import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mis vehículos · Libreta de service" };

// El listado y el alta llegan en el plan 1C.
export default function VehiculosPagina() {
  return (
    <section>
      <h1 className="text-[22px] font-semibold">Mis vehículos</h1>
      <p className="mt-6">Todavía no cargaste ningún vehículo.</p>
      <p className="mt-1 text-sm text-muted-foreground">Cargá tu auto y te decimos qué mantenimiento le toca.</p>
    </section>
  );
}
