"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Campo } from "@/components/campo";

type Props = {
  id: string;
  etiqueta: string;
  nombre: string;
  autoComplete: "current-password" | "new-password";
  ayuda?: string;
  error?: string;
};

/** Campo de contraseña con el botón para mostrarla (mockups 01 a 03). */
export function CampoContrasena(props: Props) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <Campo {...props} tipo={ver ? "text" : "password"} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-controls={props.id}
        className="absolute right-3 top-[38px] p-1 text-muted-foreground"
      >
        {ver ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
