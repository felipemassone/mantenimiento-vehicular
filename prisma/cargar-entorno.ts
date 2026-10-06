// Se importa antes que cualquier módulo que lea process.env al cargarse.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
