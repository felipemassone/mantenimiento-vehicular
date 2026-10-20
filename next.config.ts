import type { NextConfig } from "next";

const desarrollo = process.env.NODE_ENV === "development";
// El navegador habla con Supabase en dos casos: sube el comprobante a Storage (CU-11) y muestra la
// imagen con un enlace firmado (RF-15). La URL se toma al compilar, como el resto de NEXT_PUBLIC_*.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";

/**
 * OWASP A02. Política sin nonces: Next.js escribe scripts en línea para hidratar, así que
 * script-src necesita 'unsafe-inline'. Con nonces todas las páginas pasarían a renderizarse en cada
 * pedido; queda anotado para la tesis final. 'unsafe-eval' y ws: (recarga en caliente) solo en
 * desarrollo. Sin upgrade-insecure-requests: Safari lo aplica también a http://localhost, donde
 * corre la prueba de punta a punta; HTTPS y HSTS los fuerza Vercel.
 */
const politica = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${desarrollo ? "'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabase}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${desarrollo ? "ws:" : ""}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const encabezados = [
  { key: "Content-Security-Policy", value: politica },
  // Lo mismo que frame-ancestors, para navegadores que no leen CSP nivel 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // El comprobante se elige con un <input type="file">, que no pide el permiso de cámara.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: encabezados }];
  },
};

export default nextConfig;
