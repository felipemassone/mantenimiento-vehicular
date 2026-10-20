"use client";

import { PantallaError } from "@/components/pantalla-error";

/** Cualquier error no previsto debajo del layout raíz, incluidos los layouts del propietario y del admin. */
export default function PaginaError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <PantallaError codigo={error.digest} reintentar={retry} />;
}
