/**
 * PS-07 (RNF-02), tiempo en el servidor: mientras corre k6, lee en vivo los logs de ejecución de
 * la vista previa (API de Vercel) y junta la línea "[RNF-02] ficha pedido=N ms datos=M ms" de cada
 * ficha. Al terminar escribe tests/carga/servidor.md con promedio, mediana, p95 y máximo.
 *
 * Uso: BASE_URL=https://<vista previa> DURACION=5m npx tsx tests/carga/servidor.ts &
 *      (antes de k6; termina solo, DURACION + 60 s después). Necesita VERCEL_TOKEN,
 *      VERCEL_ORG_ID y VERCEL_PROJECT_ID. Nunca contra producción.
 *
 * La API corta cada conexión a las 4000 líneas: se reconecta enseguida y cuenta los cortes, porque
 * en ese instante se puede perder alguna línea. El resumen dice cuántas fichas se registraron, para
 * compararlas con las consultas de k6.
 */
import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import { duracionMs, leerLinea, resumir, type Resumen } from "./estadistica";

config({ path: ".env.local", quiet: true });

const API = "https://api.vercel.com";
const SALIDA = "tests/carga/servidor.md";
const MARGEN_MS = 60_000;

function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre}.`);
  return valor;
}

async function idDelDespliegue(host: string, token: string, equipo: string): Promise<string> {
  const r = await fetch(`${API}/v13/deployments/${host}?teamId=${equipo}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`No se encontró el despliegue ${host} (${r.status}).`);
  const d = (await r.json()) as { id: string; target: string | null };
  if (d.target === "production") throw new Error("Es producción: no se mide.");
  return d.id;
}

async function main() {
  const token = variable("VERCEL_TOKEN");
  const equipo = variable("VERCEL_ORG_ID");
  const proyecto = variable("VERCEL_PROJECT_ID");
  const host = new URL(variable("BASE_URL")).host;
  const fin = Date.now() + duracionMs(process.env.DURACION ?? "5m") + MARGEN_MS;
  const despliegue = await idDelDespliegue(host, token, equipo);

  const vistas = new Set<string>();
  const pedido: number[] = [];
  const datos: number[] = [];
  let cortes = 0;

  while (Date.now() < fin) {
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), fin - Date.now());
    try {
      const r = await fetch(`${API}/v1/projects/${proyecto}/deployments/${despliegue}/runtime-logs?teamId=${equipo}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: corte.signal,
      });
      if (!r.ok || !r.body) throw new Error(`Logs: ${r.status}`);
      let resto = "";
      const decodificador = new TextDecoder();
      const lector = r.body.getReader();
      for (let leido = await lector.read(); !leido.done; leido = await lector.read()) {
        const trozo = leido.value;
        const lineas = (resto + decodificador.decode(trozo, { stream: true })).split("\n");
        resto = lineas.pop() ?? "";
        for (const linea of lineas) {
          if (!linea.trim()) continue;
          const log = JSON.parse(linea) as { rowId: string; source: string; message: string };
          if (log.source === "delimiter") cortes++;
          const t = leerLinea(log.message);
          if (!t || vistas.has(log.rowId)) continue;
          vistas.add(log.rowId);
          pedido.push(t.pedido);
          datos.push(t.datos);
        }
      }
    } catch (e) {
      if (!corte.signal.aborted) {
        console.error(e instanceof Error ? e.message : e);
        await new Promise((listo) => setTimeout(listo, 1000));
      }
    } finally {
      clearTimeout(reloj);
    }
  }

  const fila = (nombre: string, r: Resumen | null) =>
    r
      ? `- ${nombre}: promedio ${r.promedio.toFixed(0)} ms, mediana ${r.mediana.toFixed(0)} ms, p95 ${r.p95} ms, mínimo ${r.minimo} ms, máximo ${r.maximo} ms`
      : `- ${nombre}: sin datos`;
  const total = resumir(pedido);
  const texto = [
    "## PS-07 (RNF-02): tiempo en el servidor",
    "",
    `- Vista previa: ${host} (${despliegue})`,
    `- Fichas registradas en los logs: ${pedido.length} (cortes de la API de logs: ${cortes})`,
    fila("Pedido completo (proxy → fin de la respuesta)", total),
    fila("Datos de la ficha (la transacción)", resumir(datos)),
    `- Resultado: ${total && total.promedio < 500 ? "cumple" : "NO cumple"} (promedio < 500 ms en el servidor)`,
    "",
  ].join("\n");
  writeFileSync(SALIDA, texto);
  console.log(texto);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
