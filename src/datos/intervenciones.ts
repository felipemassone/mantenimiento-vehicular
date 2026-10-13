import { BUCKET, coincideConRuta, leerComprobante, validarArchivo } from "@/dominio/comprobante";
import type { ErroresCampo } from "@/dominio/cuenta";
import { fechaDeHoy } from "@/dominio/fechas";
import { ordenarHistorial, validarEdicion, validarIntervencion } from "@/dominio/intervencion";
import { cambiosDeEstado, type Cambio } from "@/dominio/motor";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";
import { calcularEnTx } from "./estado";
import type { Resultado } from "./vehiculos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ENCONTRADO: Resultado<never> = { ok: false, errores: { formulario: "No encontramos el vehículo." } };

/** Un rechazo dentro de la transacción la aborta: no queda nada, ni los supuestos que creó calcularEnTx. */
class Rechazo extends Error {
  constructor(readonly resultado: Resultado<never>) {
    super("rechazo");
  }
}

function rechazar(errores: ErroresCampo): never {
  throw new Rechazo({ ok: false, errores });
}

async function enTransaccion<T>(claims: ClaimsUsuario, fn: (tx: TxUsuario) => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return await conUsuario(claims, fn);
  } catch (e) {
    if (e instanceof Rechazo) return e.resultado;
    throw e;
  }
}

/** Errores de validación del trabajo y del campo comprobante, juntos (se muestran todos a la vez). */
function erroresDeEntrada(v: { ok: boolean; errores?: ErroresCampo }, c: { ok: true } | { ok: false; error: string }): Resultado<never> {
  return { ok: false, errores: { ...(v.errores ?? {}), ...(c.ok ? {} : { comprobante: c.error }) } };
}

const SIN_ARCHIVO = "No encontramos el comprobante. Volvé a adjuntarlo.";

/** CU-11: el archivo tiene que estar en Storage (la RLS solo deja ver la carpeta propia) y cumplir tipo y tamaño. */
async function guardarComprobante(tx: TxUsuario, intervencionId: string, ruta: string): Promise<void> {
  const [archivo] = await tx.$queryRaw<{ tipo: string | null; tamano: string | null }[]>`
    SELECT metadata->>'mimetype' AS tipo, metadata->>'size' AS tamano
    FROM storage.objects WHERE bucket_id = ${BUCKET} AND name = ${ruta}`;
  if (!archivo) rechazar({ comprobante: SIN_ARCHIVO });
  const tamano = Number(archivo.tamano);
  const v = validarArchivo({ tipo: archivo.tipo ?? "", tamano });
  if (!v.ok) rechazar({ comprobante: v.error });
  if (!coincideConRuta(ruta, v.tipo)) rechazar({ comprobante: SIN_ARCHIVO });
  const enUso = await tx.comprobante.findUnique({ where: { rutaArchivo: ruta }, select: { intervencionId: true } });
  if (enUso && enUso.intervencionId !== intervencionId) rechazar({ comprobante: "Ese comprobante ya está en otro trabajo." });
  const datos = { rutaArchivo: ruta, tipoMime: v.tipo, tamanoBytes: tamano, fechaCarga: new Date() };
  await tx.comprobante.upsert({ where: { intervencionId }, create: { intervencionId, ...datos }, update: datos });
}

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
  const c = leerComprobante(entrada, claims.sub);
  if (!v.ok || !c.ok) return erroresDeEntrada(v, c);
  if (!UUID.test(vehiculoId)) return NO_ENCONTRADO;
  const d = v.datos;
  return enTransaccion(claims, async (tx) => {
    if (!(await bloquear(tx, vehiculoId))) return NO_ENCONTRADO;
    const antes = await calcularEnTx(tx, vehiculoId, hoy);
    if (d.tipo === "catalogo") {
      if (!antes?.catalogado) rechazar({ tipo: "Este vehículo no tiene plan: elegí «Otro trabajo»." });
      if (!antes.items.some((i) => i.itemId === d.itemId)) rechazar({ itemId: "Ese trabajo no está en el plan de este vehículo." });
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
    if (c.cambio.accion === "poner") await guardarComprobante(tx, creada.id, c.cambio.ruta);
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
): Promise<Resultado<{ cambios: Cambio[]; rutaAnterior: string | null }>> {
  const hoy = fechaDeHoy(ahora);
  const v = validarEdicion(entrada, hoy);
  const c = leerComprobante(entrada, claims.sub);
  if (!v.ok || !c.ok) return erroresDeEntrada(v, c);
  if (!UUID.test(vehiculoId)) return NO_ENCONTRADO;
  if (!UUID.test(intervencionId)) return SIN_TRABAJO;
  return enTransaccion(claims, async (tx) => {
    if (!(await bloquear(tx, vehiculoId))) return NO_ENCONTRADO;
    const antes = await calcularEnTx(tx, vehiculoId, hoy);
    const r = await tx.intervencion.updateMany({
      where: { id: intervencionId, vehiculoId, origen: "registrada" },
      data: { fecha: v.datos.fecha, kilometraje: v.datos.km, taller: v.datos.taller, costo: v.datos.costo },
    });
    if (r.count !== 1) throw new Rechazo(SIN_TRABAJO);
    // CU-11 (spec 4): la fila cambia acá; el archivo viejo lo borra quien llama, después del commit.
    const actual = await tx.comprobante.findUnique({ where: { intervencionId }, select: { rutaArchivo: true } });
    let rutaAnterior: string | null = null;
    if (c.cambio.accion === "poner" && c.cambio.ruta !== actual?.rutaArchivo) {
      await guardarComprobante(tx, intervencionId, c.cambio.ruta);
      rutaAnterior = actual?.rutaArchivo ?? null;
    } else if (c.cambio.accion === "quitar" && actual) {
      await tx.comprobante.delete({ where: { intervencionId } });
      rutaAnterior = actual.rutaArchivo;
    }
    await registrarLecturaSiSupera(tx, vehiculoId, v.datos.km, hoy);
    const despues = await calcularEnTx(tx, vehiculoId, hoy);
    return { ok: true, valor: { cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []), rutaAnterior } };
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
  return enTransaccion(claims, async (tx) => {
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

export type TrabajoDelHistorial = {
  id: string;
  origen: "registrada" | "supuesta_confirmada";
  fecha: Date;
  km: number;
  descripcion: string;
  itemId: number | null;
  taller: string | null;
  costo: string | null;
  tieneComprobante: boolean;
  editable: boolean;
  registrado: Date;
};

const SELECCION = {
  id: true,
  origen: true,
  fecha: true,
  kilometraje: true,
  itemId: true,
  descripcionLibre: true,
  taller: true,
  costo: true,
  fechaRegistro: true,
  item: { select: { nombre: true } },
  comprobante: { select: { rutaArchivo: true } },
} as const;

type Fila = {
  id: string;
  origen: string;
  fecha: Date | null;
  kilometraje: number;
  itemId: number | null;
  descripcionLibre: string | null;
  taller: string | null;
  costo: { toString(): string } | null;
  fechaRegistro: Date;
  item: { nombre: string } | null;
  comprobante: { rutaArchivo: string } | null;
};

function aTrabajo(f: Fila): TrabajoDelHistorial {
  return {
    id: f.id,
    origen: f.origen as TrabajoDelHistorial["origen"],
    fecha: f.fecha!, // registradas y confirmadas siempre tienen fecha
    km: f.kilometraje,
    descripcion: f.item?.nombre ?? f.descripcionLibre ?? "",
    itemId: f.itemId,
    taller: f.taller,
    costo: f.costo?.toString() ?? null,
    tieneComprobante: f.comprobante !== null,
    editable: f.origen === "registrada",
    registrado: f.fechaRegistro,
  };
}

const DEL_HISTORIAL = { in: ["registrada", "supuesta_confirmada"] as ("registrada" | "supuesta_confirmada")[] };

/** CU-13 (RF-17): sin supuestos pendientes ni "a verificar"; null si el vehículo no es del usuario. */
export async function historialDelVehiculo(claims: ClaimsUsuario, vehiculoId: string): Promise<TrabajoDelHistorial[] | null> {
  if (!UUID.test(vehiculoId)) return null;
  return conUsuario(claims, async (tx) => {
    if (!(await tx.vehiculo.findUnique({ where: { id: vehiculoId }, select: { id: true } }))) return null;
    const filas = await tx.intervencion.findMany({ where: { vehiculoId, origen: DEL_HISTORIAL }, select: SELECCION });
    return ordenarHistorial(filas.map(aTrabajo));
  });
}

/** Detalle de un trabajo del historial (CU-13 paso 3, CU-12 paso 2). */
export async function intervencionDelVehiculo(
  claims: ClaimsUsuario,
  vehiculoId: string,
  intervencionId: string,
): Promise<(TrabajoDelHistorial & { rutaComprobante: string | null }) | null> {
  if (!UUID.test(vehiculoId) || !UUID.test(intervencionId)) return null;
  return conUsuario(claims, async (tx) => {
    const f = await tx.intervencion.findFirst({ where: { id: intervencionId, vehiculoId, origen: DEL_HISTORIAL }, select: SELECCION });
    return f ? { ...aTrabajo(f), rutaComprobante: f.comprobante?.rutaArchivo ?? null } : null;
  });
}
