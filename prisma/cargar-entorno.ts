// Se importa antes que cualquier módulo que lea process.env al cargarse.
import { config } from "dotenv";

// ARCHIVO_ENTORNO=.env.produccion.local apunta la CLI y el seed a producción.
config({ path: process.env.ARCHIVO_ENTORNO ?? ".env.local", quiet: true });
