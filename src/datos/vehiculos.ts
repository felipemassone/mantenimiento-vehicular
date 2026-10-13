import type { ErroresCampo } from "@/dominio/cuenta";
import { fechaDeHoy } from "@/dominio/fechas";
import { validarNuevaLectura } from "@/dominio/kilometraje";
import { cambiosDeEstado, type Cambio } from "@/dominio/motor";
import { nombreVehiculo, validarAnioDelModelo, type DatosVehiculo } from "@/dominio/vehiculo";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";
import { calcularEnTx } from "./estado";

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
export type VehiculoDetalle = VehiculoResumen & {
  datos: DatosVehiculo;
  marcaId: number | null;
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
    const datos: DatosVehiculo = v.modeloId
      ? { tipo: "catalogo", modeloId: v.modeloId, anio: v.anio }
      : { tipo: "libre", marca: v.marcaLibre ?? "", modelo: v.modeloLibre ?? "", anio: v.anio };
    return {
      ...resumen(v),
      datos,
      marcaId: v.modelo?.marcaId ?? null,
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
): Promise<Resultado<{ id: string; conSupuestos: boolean }>> {
  return conUsuario(claims, async (tx) => {
    const errores = await validarCatalogo(tx, datos);
    if (errores) return { ok: false, errores };
    const v = await tx.vehiculo.create({
      data: { usuarioId: claims.sub, ...columnas(datos), lecturas: { create: { kilometraje, fecha: fechaDeHoy() } } },
    });
    // CU-05 paso 6: el cálculo guarda los supuestos; si hay, el alta ofrece confirmarlos (CU-06).
    const estado = await calcularEnTx(tx, v.id, fechaDeHoy());
    const conSupuestos = estado?.items.some((i) => i.incertidumbre !== null) ?? false;
    return { ok: true, valor: { id: v.id, conSupuestos } };
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

/**
 * CU-07 1a: la cascada borra lecturas, intervenciones y comprobantes. Devuelve las rutas de los
 * archivos de esos comprobantes (los borra quien llama, por la API de Storage), o null si el
 * vehículo no es del usuario.
 */
export async function eliminarVehiculo(claims: ClaimsUsuario, id: string): Promise<string[] | null> {
  if (!UUID.test(id)) return null;
  return conUsuario(claims, async (tx) => {
    const archivos = await tx.comprobante.findMany({ where: { intervencion: { vehiculoId: id } }, select: { rutaArchivo: true } });
    if ((await tx.vehiculo.deleteMany({ where: { id } })).count !== 1) return null;
    return archivos.map((a) => a.rutaArchivo);
  });
}

/**
 * CU-08 (RF-07): bloquea la fila del vehículo para que dos cargas simultáneas no salteen la regla,
 * valida contra la última lectura, guarda la nueva con la fecha del día y devuelve los ítems
 * que cambiaron de estado.
 */
export async function registrarLectura(
  claims: ClaimsUsuario,
  id: string,
  kilometraje: number,
): Promise<Resultado<{ cambios: Cambio[] }>> {
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
    const hoy = fechaDeHoy();
    const antes = await calcularEnTx(tx, id, hoy);
    await tx.lecturaKilometraje.create({ data: { vehiculoId: id, kilometraje, fecha: hoy } });
    const despues = await calcularEnTx(tx, id, hoy);
    // CU-08 paso 7: los ítems que cambiaron de estado con la lectura nueva.
    return { ok: true, valor: { cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []) } };
  });
}
