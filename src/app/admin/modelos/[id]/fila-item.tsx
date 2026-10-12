"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ItemDePlan } from "@/datos/catalogo";
import { formatearKm } from "@/dominio/kilometraje";
import { cambiarIntervalo, sacarItem, type EstadoAdmin } from "@/app/admin/acciones";
import { COLUMNAS_ITEM } from "./columnas";

const entrada = "h-10 w-28 rounded-md border border-input bg-card px-2 text-base tabular-nums";

/** Fila del plan con edición en línea de los intervalos (CU-16 3a). En el celular se apila. */
export function FilaItem({ modeloId, item }: { modeloId: number; item: ItemDePlan }) {
  const [editando, setEditando] = useState(false);
  const [estado, enviar, enviando] = useActionState(async (previo: EstadoAdmin, datos: FormData) => {
    const r = await cambiarIntervalo(modeloId, item.itemId, previo, datos);
    if (r.ok) setEditando(false);
    return r;
  }, {});
  const error = estado.errores?.km ?? estado.errores?.meses ?? estado.errores?.formulario;
  const tipo = (
    <span className="w-fit rounded-sm bg-muted px-1.5 py-0.5 text-[13px] text-foreground">
      {item.tipo === "reemplazo" ? "Cambiar" : "Revisar"}
    </span>
  );

  if (editando) {
    return (
      <li className="space-y-2 px-4 py-3">
        <p className="font-medium">{item.nombre}</p>
        <form action={enviar} className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-[13px] text-muted-foreground">
            <span className="block">Cada (km)</span>
            <input name="km" defaultValue={item.km} inputMode="numeric" className={entrada} />
          </label>
          <label className="space-y-1 text-[13px] text-muted-foreground">
            <span className="block">Cada (meses)</span>
            <input name="meses" defaultValue={item.meses ?? ""} inputMode="numeric" className={entrada} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="h-10" disabled={enviando}>
              Guardar
            </Button>
            <Button type="button" variant="outline" className="h-10" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
          {error && <span className="w-full text-[13px] text-destructive">{error}</span>}
        </form>
      </li>
    );
  }

  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 ${COLUMNAS_ITEM}`}>
      <span className="font-medium md:font-normal">{item.nombre}</span>
      {/* En el celular, tipo e intervalos van en una segunda línea; desde md son columnas. */}
      <span className="col-span-2 row-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground tabular-nums md:contents md:text-foreground">
        {tipo}
        <span>
          <span className="md:hidden">cada </span>
          {formatearKm(item.km)}
          <span className="md:hidden"> km</span>
        </span>
        <span>
          {item.meses ? (
            <>
              <span className="md:hidden">o </span>
              {item.meses}
              <span className="md:hidden"> meses</span>
            </>
          ) : (
            <span className="hidden md:inline">—</span>
          )}
        </span>
      </span>
      <span className="col-start-2 row-start-1 flex justify-end gap-1 md:col-start-auto md:row-start-auto">
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
      </span>
    </li>
  );
}
