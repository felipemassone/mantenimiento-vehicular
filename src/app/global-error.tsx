"use client";

import { Public_Sans } from "next/font/google";
import { PantallaError } from "@/components/pantalla-error";
import "./globals.css";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });

/** Un error en el propio layout raíz: reemplaza al documento entero, así que trae su html, estilos y fuente. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es-AR" className={publicSans.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <title>Algo salió mal · Km 12</title>
        <PantallaError codigo={error.digest} reintentar={retry} />
      </body>
    </html>
  );
}
