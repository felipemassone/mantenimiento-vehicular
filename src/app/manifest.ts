import type { MetadataRoute } from "next";

/** Ícono y nombre para "Agregar a la pantalla de inicio" (RNF-10, diseño primero para celular). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Km 12",
    short_name: "Km 12",
    description: "Sabé qué le toca a tu auto, y cuándo.",
    start_url: "/vehiculos",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#0b3d91",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
