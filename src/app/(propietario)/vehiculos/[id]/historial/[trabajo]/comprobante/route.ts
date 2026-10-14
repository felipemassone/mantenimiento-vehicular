import { notFound, redirect } from "next/navigation";
import { enlaceDelComprobante } from "@/datos/comprobantes";
import { intervencionDelVehiculo } from "@/datos/intervenciones";
import { exigirClaims } from "@/datos/sesion";
import { createClient } from "@/lib/supabase/server";

/** "Ver en tamaño completo": un enlace firmado nuevo en cada clic, así nunca se abre uno vencido (RF-15). */
export async function GET(_req: Request, { params }: RouteContext<"/vehiculos/[id]/historial/[trabajo]/comprobante">) {
  const { id, trabajo } = await params;
  const claims = await exigirClaims();
  const t = await intervencionDelVehiculo(claims, id, trabajo);
  const enlace = t?.rutaComprobante ? await enlaceDelComprobante(await createClient(), t.rutaComprobante) : null;
  if (!enlace) notFound();
  redirect(enlace);
}
