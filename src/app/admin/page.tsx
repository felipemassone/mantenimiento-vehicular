import { redirect } from "next/navigation";
import { exigirAdministracion } from "@/datos/sesion";

export default async function Admin() {
  const { roles } = await exigirAdministracion();
  redirect(roles.includes("administrador_catalogo") ? "/admin/modelos" : "/admin/usuarios");
}
