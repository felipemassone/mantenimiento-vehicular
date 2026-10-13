import { fechaDeHoy } from "@/dominio/fechas";
import { validarIntervencion } from "@/dominio/intervencion";
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
