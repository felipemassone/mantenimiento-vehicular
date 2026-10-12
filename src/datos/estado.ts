import { fechaDeHoy } from "@/dominio/fechas";
import {
  calcularEstado,
  resumen,
  supuestosFaltantes,
  type Ejecucion,
  type ItemConEstado,
  type ItemDelPlan,
} from "@/dominio/motor";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";

export type EstadoVehiculo = { catalogado: boolean; kmActual: number; items: ItemConEstado[] };
export type ResumenEstado = ReturnType<typeof resumen>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CU-14 dentro de una transacción del usuario (RLS): arma la entrada del motor, guarda los
 * supuestos que falten (spec 4.2, enfoque A) y calcula. `hoy` es un día calendario.
 */
export async function calcularEnTx(tx: TxUsuario, vehiculoId: string, hoy: Date): Promise<EstadoVehiculo | null> {
  const v = await tx.vehiculo.findUnique({ where: { id: vehiculoId }, select: { modeloId: true, fechaAlta: true } });
  if (!v) return null;
  const [alta, ultima] = await Promise.all([
    tx.lecturaKilometraje.findFirst({ where: { vehiculoId }, orderBy: [{ fecha: "asc" }, { id: "asc" }] }),
    tx.lecturaKilometraje.findFirst({ where: { vehiculoId }, orderBy: { kilometraje: "desc" } }),
  ]);
  const kmActual = ultima?.kilometraje ?? 0;
  if (v.modeloId === null) return { catalogado: false, kmActual, items: [] };

  const plan = await tx.planMantenimiento.findFirst({
    where: { modeloId: v.modeloId, estado: "publicado" },
    include: { intervalos: { include: { item: true } } },
  });
  const items: ItemDelPlan[] = (plan?.intervalos ?? []).map((i) => ({
    itemId: i.itemId,
    nombre: i.item.nombre,
    tipo: i.item.tipo,
    km: i.intervaloKm,
    meses: i.intervaloMeses,
  }));
  const filas = await tx.intervencion.findMany({
    where: { vehiculoId, itemId: { in: items.map((i) => i.itemId) } },
    select: { itemId: true, origen: true, kilometraje: true, fecha: true },
  });
  const intervenciones: Ejecucion[] = filas.map((f) => ({ itemId: f.itemId!, origen: f.origen, km: f.kilometraje, fecha: f.fecha }));
  const kmAlta = alta?.kilometraje ?? 0;

  const faltantes = supuestosFaltantes({ items, intervenciones, kmAlta });
  if (faltantes.length > 0) {
    await tx.intervencion.createMany({
      data: faltantes.map((s) => ({ vehiculoId, itemId: s.itemId, origen: "supuesta_pendiente" as const, kilometraje: s.km })),
      skipDuplicates: true,
    });
    intervenciones.push(...faltantes.map((s) => ({ itemId: s.itemId, origen: "supuesta_pendiente" as const, km: s.km, fecha: null })));
  }

  return {
    catalogado: true,
    kmActual,
    items: calcularEstado({ items, intervenciones, kmAlta, fechaAlta: fechaDeHoy(v.fechaAlta), kmActual, hoy }),
  };
}

/** CU-09: estado del vehículo, recalculado con la fecha del día. */
export async function estadoDelVehiculo(
  claims: ClaimsUsuario,
  vehiculoId: string,
  ahora: Date = new Date(),
): Promise<EstadoVehiculo | null> {
  if (!UUID.test(vehiculoId)) return null;
  return conUsuario(claims, (tx) => calcularEnTx(tx, vehiculoId, fechaDeHoy(ahora)));
}

/** Chips de "Mis vehículos" (mockup 04): null para los modelos fuera del catálogo. */
export async function resumenesDeMisVehiculos(
  claims: ClaimsUsuario,
  ahora: Date = new Date(),
): Promise<Record<string, ResumenEstado | null>> {
  const hoy = fechaDeHoy(ahora);
  return conUsuario(claims, async (tx) => {
    const vehiculos = await tx.vehiculo.findMany({ select: { id: true } });
    const salida: Record<string, ResumenEstado | null> = {};
    for (const { id } of vehiculos) {
      const e = await calcularEnTx(tx, id, hoy);
      salida[id] = e?.catalogado ? resumen(e.items) : null;
    }
    return salida;
  });
}
