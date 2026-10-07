import { rangosSeSuperponen, validarPublicacion, type DatosItem, type DatosModelo } from "@/dominio/catalogo";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";
import type { Resultado } from "./vehiculos";

export type FilaModelo = {
  id: number;
  marca: string;
  nombre: string;
  anioDesde: number;
  anioHasta: number | null;
  publicado: { version: number; fecha: Date | null } | null;
  borrador: number | null;
  items: number;
};
export type ItemDePlan = {
  itemId: number;
  nombre: string;
  tipo: "reemplazo" | "inspeccion";
  km: number;
  meses: number | null;
};
export type PlanDeTrabajo = {
  modelo: { id: number; marca: string; nombre: string; anioDesde: number; anioHasta: number | null };
  publicado: { version: number; fecha: Date | null } | null;
  borrador: number | null;
  items: ItemDePlan[];
};

const NO_ENCONTRADO = { ok: false as const, errores: { formulario: "No encontramos el modelo." } };
const rango = (desde: number, hasta: number | null) => (hasta ? `${desde}–${hasta}` : `desde ${desde}`);

export async function listarModelos(claims: ClaimsUsuario): Promise<FilaModelo[]> {
  return conUsuario(claims, async (tx) => {
    const modelos = await tx.modelo.findMany({
      include: { marca: true, planes: { include: { _count: { select: { intervalos: true } } } } },
      orderBy: [{ marca: { nombre: "asc" } }, { nombre: "asc" }, { anioDesde: "asc" }],
    });
    return modelos.map((m) => {
      const pub = m.planes.find((p) => p.estado === "publicado");
      const bor = m.planes.find((p) => p.estado === "borrador");
      return {
        id: m.id,
        marca: m.marca.nombre,
        nombre: m.nombre,
        anioDesde: m.anioDesde,
        anioHasta: m.anioHasta,
        publicado: pub ? { version: pub.version, fecha: pub.fechaPublicacion } : null,
        borrador: bor?.version ?? null,
        items: (bor ?? pub)?._count.intervalos ?? 0,
      };
    });
  });
}

export async function marcasExistentes(claims: ClaimsUsuario): Promise<string[]> {
  return conUsuario(claims, async (tx) => (await tx.marca.findMany({ orderBy: { nombre: "asc" } })).map((m) => m.nombre));
}

export async function obtenerModelo(claims: ClaimsUsuario, id: number): Promise<(DatosModelo & { id: number }) | null> {
  if (!Number.isInteger(id)) return null;
  return conUsuario(claims, async (tx) => {
    const m = await tx.modelo.findUnique({ where: { id }, include: { marca: true } });
    return m && { id: m.id, marca: m.marca.nombre, nombre: m.nombre, anioDesde: m.anioDesde, anioHasta: m.anioHasta };
  });
}

/** CU-15 paso 4: misma marca y nombre (sin distinguir mayúsculas) con años superpuestos. */
async function superpuesto(tx: TxUsuario, datos: DatosModelo, excepto?: number): Promise<string | null> {
  const iguales = await tx.modelo.findMany({
    where: {
      nombre: { equals: datos.nombre, mode: "insensitive" },
      marca: { nombre: { equals: datos.marca, mode: "insensitive" } },
      ...(excepto ? { id: { not: excepto } } : {}),
    },
    include: { marca: true },
  });
  const choque = iguales.find((m) => rangosSeSuperponen([datos.anioDesde, datos.anioHasta], [m.anioDesde, m.anioHasta]));
  return choque
    ? `Ya existe ${choque.marca.nombre} ${choque.nombre} para ${rango(choque.anioDesde, choque.anioHasta)}. Los años no se pueden superponer.`
    : null;
}

async function marcaPorNombre(tx: TxUsuario, nombre: string) {
  const existente = await tx.marca.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
  return existente ?? (await tx.marca.create({ data: { nombre } }));
}

/** CU-15 paso 5: registra el modelo con un plan vacío en borrador. */
export async function crearModelo(claims: ClaimsUsuario, datos: DatosModelo): Promise<Resultado<number>> {
  return conUsuario(claims, async (tx) => {
    const choque = await superpuesto(tx, datos);
    if (choque) return { ok: false, errores: { anioDesde: choque } };
    const marca = await marcaPorNombre(tx, datos.marca);
    const m = await tx.modelo.create({
      data: {
        marcaId: marca.id,
        nombre: datos.nombre,
        anioDesde: datos.anioDesde,
        anioHasta: datos.anioHasta,
        planes: { create: { version: 1, estado: "borrador" } },
      },
    });
    return { ok: true, valor: m.id };
  });
}

/** CU-15 3a. */
export async function actualizarModelo(claims: ClaimsUsuario, id: number, datos: DatosModelo): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    if (!(await tx.modelo.findUnique({ where: { id } }))) return NO_ENCONTRADO;
    const choque = await superpuesto(tx, datos, id);
    if (choque) return { ok: false, errores: { anioDesde: choque } };
    const marca = await marcaPorNombre(tx, datos.marca);
    await tx.modelo.update({
      where: { id },
      data: { marcaId: marca.id, nombre: datos.nombre, anioDesde: datos.anioDesde, anioHasta: datos.anioHasta },
    });
    return { ok: true, valor: null };
  });
}

export async function planDeTrabajo(claims: ClaimsUsuario, modeloId: number): Promise<PlanDeTrabajo | null> {
  if (!Number.isInteger(modeloId)) return null;
  return conUsuario(claims, async (tx) => {
    const m = await tx.modelo.findUnique({
      where: { id: modeloId },
      include: {
        marca: true,
        planes: {
          where: { estado: { in: ["borrador", "publicado"] } },
          include: { intervalos: { include: { item: true } } },
        },
      },
    });
    if (!m) return null;
    const pub = m.planes.find((p) => p.estado === "publicado");
    const bor = m.planes.find((p) => p.estado === "borrador");
    const vigente = bor ?? pub;
    return {
      modelo: { id: m.id, marca: m.marca.nombre, nombre: m.nombre, anioDesde: m.anioDesde, anioHasta: m.anioHasta },
      publicado: pub ? { version: pub.version, fecha: pub.fechaPublicacion } : null,
      borrador: bor?.version ?? null,
      items: (vigente?.intervalos ?? [])
        .map((i) => ({
          itemId: i.itemId,
          nombre: i.item.nombre,
          tipo: i.item.tipo,
          km: i.intervaloKm,
          meses: i.intervaloMeses,
        }))
        .sort((a, b) => a.km - b.km || a.nombre.localeCompare(b.nombre, "es")),
    };
  });
}

/** Devuelve el id del borrador; si no hay, lo crea copiando el publicado (CU-16 3a). */
async function asegurarBorrador(tx: TxUsuario, modeloId: number): Promise<number | null> {
  const planes = await tx.planMantenimiento.findMany({ where: { modeloId }, include: { intervalos: true } });
  if (planes.length === 0) return null;
  const borrador = planes.find((p) => p.estado === "borrador");
  if (borrador) return borrador.id;
  const publicado = planes.find((p) => p.estado === "publicado");
  const nuevo = await tx.planMantenimiento.create({
    data: {
      modeloId,
      version: Math.max(...planes.map((p) => p.version)) + 1,
      estado: "borrador",
      intervalos: {
        create: (publicado?.intervalos ?? []).map((i) => ({
          itemId: i.itemId,
          intervaloKm: i.intervaloKm,
          intervaloMeses: i.intervaloMeses,
        })),
      },
    },
  });
  return nuevo.id;
}

/** CU-16 pasos 3–4: crea o reutiliza el ítem del modelo y lo suma al borrador. */
export async function agregarItem(claims: ClaimsUsuario, modeloId: number, datos: DatosItem): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    const planId = await asegurarBorrador(tx, modeloId);
    if (!planId) return NO_ENCONTRADO;
    const item =
      (await tx.itemMantenimiento.findFirst({
        where: { modeloId, nombre: { equals: datos.nombre, mode: "insensitive" } },
      })) ?? (await tx.itemMantenimiento.create({ data: { modeloId, nombre: datos.nombre, tipo: datos.tipo } }));
    if (await tx.intervaloPlan.findUnique({ where: { planId_itemId: { planId, itemId: item.id } } })) {
      return { ok: false, errores: { nombre: "Ya hay un ítem con ese nombre en el plan." } };
    }
    await tx.intervaloPlan.create({
      data: { planId, itemId: item.id, intervaloKm: datos.km, intervaloMeses: datos.meses },
    });
    return { ok: true, valor: null };
  });
}

/** CU-16 3a: modifica los intervalos de un ítem en el borrador. */
export async function editarIntervalo(
  claims: ClaimsUsuario,
  modeloId: number,
  itemId: number,
  intervalo: { km: number; meses: number | null },
): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    const planId = await asegurarBorrador(tx, modeloId);
    if (!planId) return NO_ENCONTRADO;
    const r = await tx.intervaloPlan.updateMany({
      where: { planId, itemId },
      data: { intervaloKm: intervalo.km, intervaloMeses: intervalo.meses },
    });
    return r.count === 1 ? { ok: true, valor: null } : { ok: false, errores: { formulario: "El ítem no está en el plan." } };
  });
}

/** CU-16 3a: quita el ítem del borrador (el ítem queda para el historial). */
export async function quitarItem(claims: ClaimsUsuario, modeloId: number, itemId: number): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    const planId = await asegurarBorrador(tx, modeloId);
    if (!planId) return NO_ENCONTRADO;
    await tx.intervaloPlan.deleteMany({ where: { planId, itemId } });
    return { ok: true, valor: null };
  });
}

/** CU-17: valida (RF-20) y publica; la versión anterior pasa a reemplazada en la misma transacción. */
export async function publicarPlan(claims: ClaimsUsuario, modeloId: number): Promise<Resultado<number>> {
  return conUsuario(claims, async (tx) => {
    const borrador = await tx.planMantenimiento.findFirst({
      where: { modeloId, estado: "borrador" },
      include: { intervalos: { include: { item: true } } },
    });
    if (!borrador) return { ok: false, errores: { plan: "No hay un borrador para publicar." } };
    const errores = validarPublicacion(
      borrador.intervalos.map((i) => ({ nombre: i.item.nombre, km: i.intervaloKm, meses: i.intervaloMeses })),
    );
    if (errores.length > 0) return { ok: false, errores: { plan: errores.join(" ") } };
    await tx.planMantenimiento.updateMany({ where: { modeloId, estado: "publicado" }, data: { estado: "reemplazado" } });
    await tx.planMantenimiento.update({
      where: { id: borrador.id },
      data: { estado: "publicado", fechaPublicacion: new Date() },
    });
    return { ok: true, valor: borrador.version };
  });
}

/** Descarta el borrador y vuelve a la versión publicada. */
export async function descartarBorrador(claims: ClaimsUsuario, modeloId: number): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    const hayPublicado = await tx.planMantenimiento.count({ where: { modeloId, estado: "publicado" } });
    if (!hayPublicado) return { ok: false, errores: { plan: "No hay una versión publicada a la cual volver." } };
    await tx.planMantenimiento.deleteMany({ where: { modeloId, estado: "borrador" } });
    return { ok: true, valor: null };
  });
}
