import { fechaDeHoy } from "@/dominio/fechas";
import {
  calcularEstado,
  resumen,
  supuestosFaltantes,
  type Ejecucion,
  type ItemConEstado,
  type ItemDelPlan,
} from "@/dominio/motor";
import { validarConfirmacion, validarCorreccion } from "@/dominio/supuestos";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";
import type { Resultado } from "./vehiculos";

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
    // Primero el vehículo, como registrarLectura: si no, el índice único y la clave foránea se
    // esperan en orden inverso y PostgreSQL corta una de las dos transacciones (deadlock).
    await tx.$queryRaw`SELECT 1 FROM public.vehiculo WHERE id = ${vehiculoId}::uuid FOR UPDATE`;
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
  const inicio = performance.now();
  const estado = await conUsuario(claims, (tx) => calcularEnTx(tx, vehiculoId, fechaDeHoy(ahora)));
  // RNF-01 (spec 4.4): la duración queda en los logs de Vercel; sin datos del usuario.
  console.info(`[RNF-01] estadoDelVehiculo ${Math.round(performance.now() - inicio)} ms`);
  return estado;
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

export type SupuestoPendiente = {
  itemId: number;
  nombre: string;
  km: number;
  origen: "supuesta_pendiente" | "supuesta_a_verificar";
};

const SIN_SUPUESTO: Resultado<never> = {
  ok: false,
  errores: { formulario: "Ese dato ya no está para confirmar. Volvé a la ficha del vehículo." },
};
const PENDIENTES = ["supuesta_pendiente", "supuesta_a_verificar"] as const;

/** CU-06 paso 1: supuestos sin confirmar del plan vigente, en el orden del motor. */
export async function supuestosDelVehiculo(
  claims: ClaimsUsuario,
  vehiculoId: string,
  ahora: Date = new Date(),
): Promise<{ kmActual: number; supuestos: SupuestoPendiente[] } | null> {
  if (!UUID.test(vehiculoId)) return null;
  return conUsuario(claims, async (tx) => {
    const e = await calcularEnTx(tx, vehiculoId, fechaDeHoy(ahora));
    if (!e) return null;
    const filas = await tx.intervencion.findMany({
      where: { vehiculoId, origen: { in: [...PENDIENTES] } },
      select: { itemId: true, kilometraje: true, origen: true },
    });
    // Spec 3.1 (Iteración 3): un ítem con un trabajo registrado ya no se ofrece para confirmar.
    const conTrabajo = new Set(
      (await tx.intervencion.findMany({ where: { vehiculoId, origen: "registrada", itemId: { not: null } }, select: { itemId: true } }))
        .map((f) => f.itemId),
    );
    const porItem = new Map(filas.map((f) => [f.itemId, f]));
    const supuestos = e.items.flatMap((i) => {
      const f = porItem.get(i.itemId);
      return f && !conTrabajo.has(i.itemId) ? [{ itemId: i.itemId, nombre: i.nombre, km: f.kilometraje, origen: f.origen as SupuestoPendiente["origen"] }] : [];
    });
    return { kmActual: e.kmActual, supuestos };
  });
}

async function actualizarSupuesto(
  tx: TxUsuario,
  vehiculoId: string,
  itemId: number,
  data: { origen: "supuesta_confirmada" | "supuesta_a_verificar"; kilometraje?: number; fecha?: Date },
): Promise<Resultado<null>> {
  const r = await tx.intervencion.updateMany({ where: { vehiculoId, itemId, origen: { in: [...PENDIENTES] } }, data });
  return r.count === 1 ? { ok: true, valor: null } : SIN_SUPUESTO;
}

async function kmActualDe(tx: TxUsuario, vehiculoId: string): Promise<number | null> {
  const ultima = await tx.lecturaKilometraje.findFirst({ where: { vehiculoId }, orderBy: { kilometraje: "desc" } });
  return ultima?.kilometraje ?? null;
}

/** CU-06 paso 2: confirma el supuesto con su fecha. */
export async function confirmarSupuesto(
  claims: ClaimsUsuario,
  vehiculoId: string,
  itemId: number,
  fecha: unknown,
  ahora: Date = new Date(),
): Promise<Resultado<null>> {
  const v = validarConfirmacion({ fecha, hoy: fechaDeHoy(ahora) });
  if (!v.ok) return v;
  if (!UUID.test(vehiculoId)) return SIN_SUPUESTO;
  return conUsuario(claims, (tx) => actualizarSupuesto(tx, vehiculoId, itemId, { origen: "supuesta_confirmada", fecha: v.fecha }));
}

/** CU-06 2a: reemplaza el supuesto por el km y la fecha reales. */
export async function corregirSupuesto(
  claims: ClaimsUsuario,
  vehiculoId: string,
  itemId: number,
  km: unknown,
  fecha: unknown,
  ahora: Date = new Date(),
): Promise<Resultado<null>> {
  if (!UUID.test(vehiculoId)) return SIN_SUPUESTO;
  return conUsuario(claims, async (tx) => {
    const kmActual = await kmActualDe(tx, vehiculoId);
    if (kmActual === null) return SIN_SUPUESTO;
    const v = validarCorreccion({ km, fecha, kmActual, hoy: fechaDeHoy(ahora) });
    if (!v.ok) return v;
    return actualizarSupuesto(tx, vehiculoId, itemId, { origen: "supuesta_confirmada", kilometraje: v.km, fecha: v.fecha });
  });
}

/** CU-06 2b: "No lo sé". */
export async function marcarAVerificar(claims: ClaimsUsuario, vehiculoId: string, itemId: number): Promise<Resultado<null>> {
  if (!UUID.test(vehiculoId)) return SIN_SUPUESTO;
  return conUsuario(claims, async (tx) => {
    // Con los dos orígenes pendientes, tocar dos veces "No lo sé" no da error.
    const r = await tx.intervencion.updateMany({
      where: { vehiculoId, itemId, origen: { in: [...PENDIENTES] } },
      data: { origen: "supuesta_a_verificar" },
    });
    return r.count === 1 ? { ok: true, valor: null } : SIN_SUPUESTO;
  });
}
