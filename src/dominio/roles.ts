import { z } from "zod";

/** CU-18, RF-21: el único rol que se otorga o revoca desde la app es administrador_catalogo. */
export const esquemaCambiarRol = z.object({
  usuarioId: z.uuid({ error: "No encontramos la cuenta." }),
  otorgar: z.enum(["1", "0"], { error: "Elegí otorgar o revocar." }).transform((v) => v === "1"),
});
