import { fechaDeHoy } from "@/dominio/fechas";
import { validarEdicion, validarIntervencion } from "@/dominio/intervencion";
import { cambiosDeEstado, type Cambio } from "@/dominio/motor";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";
import { calcularEnTx } from "./estado";
import type { Resultado } from "./vehiculos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ENCONTRADO: Resultado<never> = { ok: false, errores: { formulario: "No encontramos el vehículo." } };

/** Bloquea el vehículo (como registrarLectura) para que dos escrituras no se crucen; false si no es del usuario. */
async function bloquear(tx: TxUsuario, vehiculoId: string): Promise<boolean> {
  const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.vehiculo WHERE id = ${vehiculoId}::uuid FOR UPDATE`;
  return filas.length === 1;
}

/** CU-10 4a: si el km supera la última lectura, queda también como lectura, con la fecha del día. */
async function registrarLecturaSiSupera(tx: TxUsuario, vehiculoId: string, km: number, hoy: Date): Promise<void> {
  const ultima = await tx.lecturaKilometraje.findFirst({ where: { vehiculoId }, orderBy: { kilometraje: "desc" } });
  if (km > (ultima?.kilometraje ?? 0)) await tx.lecturaKilometraje.create({ data: { vehiculoId, kilometraje: km, fecha: hoy } });
}

/** CU-10 (RF-13, RF-14, RNF-07): todo en una transacción; devuelve los ítems que cambiaron de estado. */
export async function registrarIntervencion(
  claims: ClaimsUsuario,
  vehiculoId: string,
  entrada: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<Resultado<{ id: string; cambios: Cambio[] }>> {
  const hoy = fechaDeHoy(ahora);
  const v = validarIntervencion(entrada, hoy);
  if (!v.ok) return v;
  if (!UUID.test(vehiculoId)) return NO_ENCONTRADO;
  const d = v.datos;
  return conUsuario(claims, async (tx) => {
    if (!(await bloquear(tx, vehiculoId))) return NO_ENCONTRADO;
    const antes = await calcularEnTx(tx, vehiculoId, hoy);
    if (d.tipo === "catalogo") {
      if (!antes?.catalogado) return { ok: false, errores: { tipo: "Este vehículo no tiene plan: elegí «Otro trabajo»." } };
      if (!antes.items.some((i) => i.itemId === d.itemId)) {
        return { ok: false, errores: { itemId: "Ese trabajo no está en el plan de este vehículo." } };
      }
    }
    const creada = await tx.intervencion.create({
      data: {
        vehiculoId,
        origen: "registrada",
        itemId: d.tipo === "catalogo" ? d.itemId : null,
        descripcionLibre: d.tipo === "libre" ? d.descripcion : null,
        fecha: d.fecha,
        kilometraje: d.km,
        taller: d.taller,
        costo: d.costo,
      },
      select: { id: true },
    });
    await registrarLecturaSiSupera(tx, vehiculoId, d.km, hoy);
    const despues = await calcularEnTx(tx, vehiculoId, hoy);
    return { ok: true, valor: { id: creada.id, cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []) } };
  });
}

const SIN_TRABAJO: Resultado<never> = { ok: false, errores: { formulario: "Ese trabajo ya no existe. Volvé al historial." } };

/** CU-12: solo los trabajos registrados; el ítem y la descripción no cambian. */
export async function editarIntervencion(
  claims: ClaimsUsuario,
  vehiculoId: string,
  intervencionId: string,
  entrada: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<Resultado<{ cambios: Cambio[] }>> {
  const hoy = fechaDeHoy(ahora);
  const v = validarEdicion(entrada, hoy);
  if (!v.ok) return v;
  if (!UUID.test(vehiculoId)) return NO_ENCONTRADO;
  if (!UUID.test(intervencionId)) return SIN_TRABAJO;
  return conUsuario(claims, async (tx) => {
    if (!(await bloquear(tx, vehiculoId))) return NO_ENCONTRADO;
    const antes = await calcularEnTx(tx, vehiculoId, hoy);
    const r = await tx.intervencion.updateMany({
      where: { id: intervencionId, vehiculoId, origen: "registrada" },
      data: { fecha: v.datos.fecha, kilometraje: v.datos.km, taller: v.datos.taller, costo: v.datos.costo },
    });
    if (r.count !== 1) return SIN_TRABAJO;
    await registrarLecturaSiSupera(tx, vehiculoId, v.datos.km, hoy);
    const despues = await calcularEnTx(tx, vehiculoId, hoy);
    return { ok: true, valor: { cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []) } };
  });
}

/** CU-12 1a: borra el trabajo (y su comprobante, en cascada); el cálculo vuelve a la ejecución anterior. */
export async function eliminarIntervencion(
  claims: ClaimsUsuario,
  vehiculoId: string,
  intervencionId: string,
  ahora: Date = new Date(),
): Promise<Resultado<{ cambios: Cambio[]; rutaComprobante: string | null }>> {
  const hoy = fechaDeHoy(ahora);
  if (!UUID.test(vehiculoId)) return NO_ENCONTRADO;
  if (!UUID.test(intervencionId)) return SIN_TRABAJO;
  return conUsuario(claims, async (tx) => {
    if (!(await bloquear(tx, vehiculoId))) return NO_ENCONTRADO;
    const trabajo = await tx.intervencion.findFirst({
      where: { id: intervencionId, vehiculoId, origen: "registrada" },
      select: { comprobante: { select: { rutaArchivo: true } } },
    });
    if (!trabajo) return SIN_TRABAJO;
    const antes = await calcularEnTx(tx, vehiculoId, hoy);
    await tx.intervencion.delete({ where: { id: intervencionId } });
    const despues = await calcularEnTx(tx, vehiculoId, hoy);
    return {
      ok: true,
      valor: {
        cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []),
        rutaComprobante: trabajo.comprobante?.rutaArchivo ?? null,
      },
    };
  });
}
