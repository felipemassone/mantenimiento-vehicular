"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Aviso } from "@/components/aviso";
import { cn } from "@/lib/utils";

/** El texto del aviso y los ítems que cambiaron (la línea oro). */
export type Ultimos = { texto: string; itemIds: number[] } | null;
const Contexto = createContext<{ ultimos: Ultimos; publicar: (u: Ultimos) => void }>({
  ultimos: null,
  publicar: () => {},
});

/**
 * CU-08 paso 7 y CU-10 paso 7: los cambios viven solo mientras dura esta visita a la ficha. Los de
 * un trabajo registrado llegan en `?cambios=`; se sacan de la URL para que al recargar no vuelvan.
 */
export function ProveedorCambios({ inicial = null, children }: { inicial?: Ultimos; children: ReactNode }) {
  const [ultimos, publicar] = useState<Ultimos>(inicial);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("cambios")) return;
    url.searchParams.delete("cambios");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return <Contexto.Provider value={{ ultimos, publicar }}>{children}</Contexto.Provider>;
}

export function usePublicarCambios() {
  return useContext(Contexto).publicar;
}

export function AvisoCambios() {
  const { ultimos } = useContext(Contexto);
  return ultimos ? (
    <div className="mt-4">
      <Aviso tipo="info">{ultimos.texto}</Aviso>
    </div>
  ) : null;
}

/** Fila de la sección Mantenimiento; la línea oro marca lo que cambió (mockup 14). */
export function FilaItem({ itemId, className, children }: { itemId: number; className: string; children: ReactNode }) {
  const { ultimos } = useContext(Contexto);
  const cambio = ultimos?.itemIds.includes(itemId);
  return <li className={cn(className, cambio && "shadow-[inset_2px_0_0_0_var(--color-oro)]")}>{children}</li>;
}
