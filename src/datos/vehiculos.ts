import type { ErroresCampo } from "@/dominio/cuenta";
import { fechaDeHoy } from "@/dominio/fechas";
import { validarNuevaLectura } from "@/dominio/kilometraje";
import { nombreVehiculo, validarAnioDelModelo, type DatosVehiculo } from "@/dominio/vehiculo";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";

export type ModeloCatalogo = { id: number; nombre: string; anioDesde: number; anioHasta: number | null };
export type MarcaCatalogo = { id: number; nombre: string; modelos: ModeloCatalogo[] };
export type VehiculoResumen = {
  id: string;
  nombre: string;
  anio: number;
  kilometraje: number | null;
  fechaLectura: Date | null;
  catalogado: boolean;
};
export type ItemPlan = { nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null };
export type VehiculoDetalle = VehiculoResumen & {
  datos: DatosVehiculo;
  marcaId: number | null;
  plan: { version: number; items: ItemPlan[] } | null;
};
export type Resultado<T> = { ok: true; valor: T } | { ok: false; errores: ErroresCampo };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ENCONTRADO: Resultado<never> = { ok: false, errores: { formulario: "No encontramos el vehículo." } };
const CON_PLAN = { planes: { some: { estado: "publicado" as const } } };
const INCLUIR = {
  modelo: { include: { marca: true } },
  lecturas: { orderBy: { kilometraje: "desc" as const }, take: 1 },
};

function buscarVehiculos(tx: TxUsuario, id?: string) {
  return tx.vehiculo.findMany({ where: id ? { id } : {}, include: INCLUIR, orderBy: { fechaAlta: "asc" } });
}
type FilaVehiculo = Awaited<ReturnType<typeof buscarVehiculos>>[number];

function resumen(v: FilaVehiculo): VehiculoResumen {
  const ultima = v.lecturas[0];
  return {
    id: v.id,
    nombre: nombreVehiculo({
      marca: v.modelo?.marca.nombre,
      modelo: v.modelo?.nombre,
      marcaLibre: v.marcaLibre,
      modeloLibre: v.modeloLibre,
    }),
    anio: v.anio,
    kilometraje: ultima?.kilometraje ?? null,
    fechaLectura: ultima?.fecha ?? null,
    catalogado: v.modeloId !== null,
  };
}

/** CU-05 paso 2: marcas y modelos con plan publicado. */
export async function catalogoPublicado(claims: ClaimsUsuario): Promise<MarcaCatalogo[]> {
  return conUsuario(claims, async (tx) => {
    const marcas = await tx.marca.findMany({
      where: { modelos: { some: CON_PLAN } },
      orderBy: { nombre: "asc" },
      include: {
        modelos: {
          where: CON_PLAN,
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true, anioDesde: true, anioHasta: true },
        },
      },
    });
    return marcas.map((m) => ({ id: m.id, nombre: m.nombre, modelos: m.modelos }));
  });
}

export async function listarVehiculos(claims: ClaimsUsuario): Promise<VehiculoResumen[]> {
  return conUsuario(claims, async (tx) => (await buscarVehiculos(tx)).map(resumen));
}

export async function obtenerVehiculo(claims: ClaimsUsuario, id: string): Promise<VehiculoDetalle | null> {
  if (!UUID.test(id)) return null;
  return conUsuario(claims, async (tx) => {
    const [v] = await buscarVehiculos(tx, id);
    if (!v) return null;
    const plan = v.modeloId
      ? await tx.planMantenimiento.findFirst({
          where: { modeloId: v.modeloId, estado: "publicado" },
          include: { intervalos: { include: { item: true }, orderBy: { intervaloKm: "asc" } } },
        })
      : null;
    const datos: DatosVehiculo = v.modeloId
      ? { tipo: "catalogo", modeloId: v.modeloId, anio: v.anio }
      : { tipo: "libre", marca: v.marcaLibre ?? "", modelo: v.modeloLibre ?? "", anio: v.anio };
    return {
      ...resumen(v),
      datos,
      marcaId: v.modelo?.marcaId ?? null,
      plan: plan && {
        version: plan.version,
        items: plan.intervalos.map((i) => ({
          nombre: i.item.nombre,
          tipo: i.item.tipo,
          km: i.intervaloKm,
          meses: i.intervaloMeses,
        })),
      },
    };
  });
}

/** Verifica el modelo del catálogo (que tenga plan publicado) y el rango de años. */
async function validarCatalogo(tx: TxUsuario, datos: DatosVehiculo): Promise<ErroresCampo | null> {
  if (datos.tipo !== "catalogo") return null;
  const modelo = await tx.modelo.findFirst({ where: { id: datos.modeloId, ...CON_PLAN } });
  if (!modelo) return { modeloId: "Elegí un modelo de la lista." };
  const r = validarAnioDelModelo(datos.anio, modelo.anioDesde, modelo.anioHasta);
  return r.ok ? null : { anio: r.mensaje };
}

function columnas(datos: DatosVehiculo) {
  return datos.tipo === "catalogo"
    ? { modeloId: datos.modeloId, marcaLibre: null, modeloLibre: null, anio: datos.anio }
    : { modeloId: null, marcaLibre: datos.marca, modeloLibre: datos.modelo, anio: datos.anio };
}

/** CU-05 pasos 4–5: valida y registra el vehículo con su primera lectura. */
export async function crearVehiculo(
  claims: ClaimsUsuario,
  datos: DatosVehiculo,
  kilometraje: number,
): Promise<Resultado<string>> {
  return conUsuario(claims, async (tx) => {
    const errores = await validarCatalogo(tx, datos);
    if (errores) return { ok: false, errores };
    const v = await tx.vehiculo.create({
      data: { usuarioId: claims.sub, ...columnas(datos), lecturas: { create: { kilometraje, fecha: fechaDeHoy() } } },
    });
    return { ok: true, valor: v.id };
  });
}

/** CU-07 pasos 3–4. El kilometraje no se edita acá: se actualiza con CU-08. */
export async function actualizarVehiculo(
  claims: ClaimsUsuario,
  id: string,
  datos: DatosVehiculo,
): Promise<Resultado<null>> {
  if (!UUID.test(id)) return NO_ENCONTRADO;
  return conUsuario(claims, async (tx) => {
    if (!(await tx.vehiculo.findUnique({ where: { id }, select: { id: true } }))) return NO_ENCONTRADO;
    const errores = await validarCatalogo(tx, datos);
    if (errores) return { ok: false, errores };
    await tx.vehiculo.update({ where: { id }, data: columnas(datos) });
    return { ok: true, valor: null };
  });
}

/** CU-07 1a: la cascada borra lecturas, intervenciones y comprobantes. */
export async function eliminarVehiculo(claims: ClaimsUsuario, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  return conUsuario(claims, async (tx) => (await tx.vehiculo.deleteMany({ where: { id } })).count === 1);
}

/**
 * CU-08 (RF-07): bloquea la fila del vehículo para que dos cargas simultáneas no salteen la regla,
 * valida contra la última lectura y guarda la nueva con la fecha del día.
 */
export async function registrarLectura(
  claims: ClaimsUsuario,
  id: string,
  kilometraje: number,
): Promise<Resultado<null>> {
  if (!UUID.test(id)) return NO_ENCONTRADO;
  return conUsuario(claims, async (tx) => {
    const bloqueado = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.vehiculo WHERE id = ${id}::uuid FOR UPDATE`;
    if (bloqueado.length === 0) return NO_ENCONTRADO;
    const ultima = await tx.lecturaKilometraje.findFirst({
      where: { vehiculoId: id },
      orderBy: { kilometraje: "desc" },
    });
    const r = validarNuevaLectura(ultima?.kilometraje ?? null, kilometraje);
    if (!r.ok) return { ok: false, errores: { kilometraje: r.mensaje } };
    await tx.lecturaKilometraje.create({ data: { vehiculoId: id, kilometraje, fecha: fechaDeHoy() } });
    return { ok: true, valor: null };
  });
}
