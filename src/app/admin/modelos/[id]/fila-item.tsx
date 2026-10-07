"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ItemDePlan } from "@/datos/catalogo";
import { formatearKm } from "@/dominio/kilometraje";
import { cambiarIntervalo, sacarItem, type EstadoAdmin } from "@/app/admin/acciones";

const entrada = "h-10 w-28 rounded-md border border-input bg-card px-2 text-sm tabular-nums";

/** Fila del plan con edición en línea de los intervalos (CU-16 3a). */
export function FilaItem({ modeloId, item }: { modeloId: number; item: ItemDePlan }) {
  const [editando, setEditando] = useState(false);
  const [estado, enviar, enviando] = useActionState(async (previo: EstadoAdmin, datos: FormData) => {
    const r = await cambiarIntervalo(modeloId, item.itemId, previo, datos);
    if (r.ok) setEditando(false);
    return r;
  }, {});
  const error = estado.errores?.km ?? estado.errores?.meses ?? estado.errores?.formulario;

  return (
    <tr>
      <td className="px-4 py-3">{item.nombre}</td>
      <td className="px-4 py-3">
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[13px]">
          {item.tipo === "reemplazo" ? "Cambiar" : "Revisar"}
        </span>
      </td>
      {editando ? (
        <td colSpan={3} className="px-4 py-2">
          <form action={enviar} className="flex flex-wrap items-center gap-2">
            <input name="km" defaultValue={item.km} inputMode="numeric" aria-label="Cada (km)" className={entrada} />
            <input
              name="meses"
              defaultValue={item.meses ?? ""}
              inputMode="numeric"
              aria-label="Cada (meses)"
              className={entrada}
            />
            <Button type="submit" size="sm" disabled={enviando}>
              Guardar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            {error && <span className="w-full text-[13px] text-destructive">{error}</span>}
          </form>
        </td>
      ) : (
        <>
          <td className="px-4 py-3 tabular-nums">{formatearKm(item.km)}</td>
          <td className="px-4 py-3 tabular-nums">{item.meses ?? "—"}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Editar ${item.nombre}`}
                onClick={() => setEditando(true)}
              >
                <Pencil className="size-4" />
              </Button>
              <form action={sacarItem.bind(null, modeloId, item.itemId)}>
                <Button type="submit" size="icon" variant="ghost" aria-label={`Quitar ${item.nombre}`}>
                  <Trash2 className="size-4" />
                </Button>
              </form>
            </div>
          </td>
        </>
      )}
    </tr>
  );
}
