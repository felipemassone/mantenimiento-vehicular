import { fechaDeHoy } from "@/dominio/fechas";
import { conUsuario, type ClaimsUsuario } from "./cliente-usuario";
import { calcularEnTx, type EstadoVehiculo } from "./estado";
import { historialEnTx, type TrabajoDelHistorial } from "./intervenciones";
import { vehiculoEnTx, type VehiculoDetalle } from "./vehiculos";

export type FichaVehiculo = {
  vehiculo: VehiculoDetalle;
  estado: EstadoVehiculo | null;
  historial: TrabajoDelHistorial[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ficha del vehículo (CU-09): datos, estado e historial en una sola transacción del usuario.
 * Antes eran tres en paralelo, y con 50 usuarios a la vez cada ficha ocupaba tres conexiones
 * del pooler (PS-07, RNF-02). Null si el vehículo no es del usuario.
 */
export async function fichaDelVehiculo(
  claims: ClaimsUsuario,
  vehiculoId: string,
  ahora: Date = new Date(),
): Promise<FichaVehiculo | null> {
  if (!UUID.test(vehiculoId)) return null;
  return conUsuario(claims, async (tx) => {
    const vehiculo = await vehiculoEnTx(tx, vehiculoId);
    if (!vehiculo) return null;
    const estado = await calcularEnTx(tx, vehiculoId, fechaDeHoy(ahora));
    return { vehiculo, estado, historial: await historialEnTx(tx, vehiculoId) };
  });
}
