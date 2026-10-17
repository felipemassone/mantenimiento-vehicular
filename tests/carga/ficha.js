/* global __ENV, __VU, open */
/**
 * PS-07 (RNF-02): 50 usuarios virtuales consultan la ficha de su vehículo durante 5 minutos.
 * Criterio: promedio menor a 500 ms y 0 % de errores. Cada usuario usa su propia cuenta
 * (tests/carga/preparar.ts) y espera 1 s entre consultas, como alguien que mira la pantalla.
 *
 * k6 run -e BASE_URL=https://<vista previa> -e VERCEL_AUTOMATION_BYPASS_SECRET=... tests/carga/ficha.js
 * Nunca contra producción: las cuentas y los vehículos existen solo en la base de desarrollo.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const sesiones = JSON.parse(open("./sesiones.json"));
const BASE_URL = __ENV.BASE_URL;
if (!BASE_URL) throw new Error("Falta BASE_URL (la vista previa).");

export const options = {
  vus: Number(__ENV.VUS ?? 50),
  duration: __ENV.DURACION ?? "5m",
  thresholds: {
    http_req_duration: ["avg<500"],
    http_req_failed: ["rate==0"],
    checks: ["rate==1"],
  },
};

// Solo un 200 es éxito: una redirección a /ingresar sería una sesión perdida, no una ficha.
http.setResponseCallback(http.expectedStatuses(200));

export default function consultarFicha() {
  const sesion = sesiones[(__VU - 1) % sesiones.length];
  const headers = { Cookie: sesion.cookie };
  // Las vistas previas de Vercel piden ingresar; el secreto de automatización las abre.
  if (__ENV.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] = __ENV.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  const respuesta = http.get(`${BASE_URL}${sesion.ficha}`, { headers, redirects: 0, tags: { name: "ficha" } });
  check(respuesta, {
    "responde 200": (r) => r.status === 200,
    // El kilometraje del alta y la lista de mantenimiento: la ficha calculada, no otra pantalla.
    "muestra la ficha": (r) =>
      typeof r.body === "string" && r.body.includes("62.400 km") && r.body.includes(">Mantenimiento</h2>"),
  });
  sleep(1);
}

function ms(valor) {
  return `${valor.toFixed(0)} ms`;
}

export function handleSummary(data) {
  const d = data.metrics.http_req_duration.values;
  const fallidas = data.metrics.http_req_failed.values;
  const consultas = data.metrics.http_reqs.values.count;
  const cumple = d.avg < 500 && fallidas.rate === 0 && data.metrics.checks.values.rate === 1;
  const texto = [
    `## PS-07 (RNF-02): ${options.vus} usuarios, ${options.duration}`,
    "",
    `- Vista previa: ${BASE_URL}`,
    `- Consultas: ${consultas} (${data.metrics.http_reqs.values.rate.toFixed(1)} por segundo)`,
    `- Tiempo de respuesta: promedio ${ms(d.avg)}, mediana ${ms(d.med)}, p95 ${ms(d["p(95)"])}, mínimo ${ms(d.min)}, máximo ${ms(d.max)}`,
    `- Errores: ${(fallidas.rate * 100).toFixed(2)} % (${fallidas.passes} de ${consultas})`,
    `- Resultado: ${cumple ? "cumple" : "NO cumple"} (promedio < 500 ms y 0 % de errores)`,
    "",
  ].join("\n");
  return { stdout: texto, "tests/carga/resumen.md": texto };
}
