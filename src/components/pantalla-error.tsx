"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

/**
 * OWASP A10: lo que ve el usuario ante un error inesperado. No muestra el mensaje ni la pila: en
 * producción Next.js tampoco los manda al navegador. El código es el `digest` del error, el mismo
 * que queda en los logs del servidor, para poder ubicarlo si alguien lo reporta.
 */
export function PantallaError({ codigo, reintentar }: { codigo?: string; reintentar: () => void }) {
  return (
    <main className="mx-auto w-full max-w-sm px-4 pb-10 pt-6">
      <Logo />
      <h1 className="mt-8 text-[22px] font-semibold leading-7">Algo salió mal</h1>
      <p className="mt-2 text-muted-foreground">
        No pudimos mostrar esta pantalla. Probá de nuevo; si sigue pasando, volvé a intentarlo en unos minutos.
      </p>
      <div className="mt-6 space-y-3">
        <Button type="button" className="h-12 w-full" onClick={reintentar}>
          Intentar de nuevo
        </Button>
        <Button asChild variant="outline" className="h-12 w-full">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
      {codigo && <p className="mt-6 text-[13px] text-muted-foreground tabular-nums">Código del error: {codigo}</p>}
    </main>
  );
}
