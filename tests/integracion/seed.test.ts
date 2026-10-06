import { describe, expect, it } from "vitest";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { sembrar } from "../../prisma/seed";

describe("seed del Ford Ka 2014", () => {
  it("es idempotente y deja el plan publicado con 8 ítems", async () => {
    await sembrar();
    await sembrar();

    const modelos = await db.modelo.findMany({ where: { nombre: "Ka", marca: { nombre: "Ford" } } });
    expect(modelos).toHaveLength(1);

    const planes = await db.planMantenimiento.findMany({
      where: { modeloId: modelos[0]!.id },
      include: { intervalos: { include: { item: true } } },
    });
    expect(planes).toHaveLength(1);
    expect(planes[0]!.estado).toBe("publicado");
    expect(planes[0]!.intervalos).toHaveLength(8);

    const aceite = planes[0]!.intervalos.find((i) => i.item.nombre === "Aceite y filtro de aceite");
    expect(aceite).toMatchObject({ intervaloKm: 15000, intervaloMeses: 12 });
    expect(aceite!.item.tipo).toBe("reemplazo");

    const refrigerante = planes[0]!.intervalos.find((i) => i.item.nombre === "Líquido de enfriamiento");
    expect(refrigerante).toMatchObject({ intervaloKm: 90000, intervaloMeses: 36 });
  });
});
