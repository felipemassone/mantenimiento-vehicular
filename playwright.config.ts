import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const enCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  // Un solo recorrido largo y en serie (cuenta, vehículo, trabajos y baja): con los pasos del 16/10
  // pasó los 90 s en el CI y la prueba se cortaba en la baja de la cuenta.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: enCI,
  reporter: enCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  // Diseño primero para celular (RNF-10); el mismo recorrido en los otros motores de RNF-09
  // (Firefox, WebKit, el de Safari, y Edge instalado). En serie: cada uno crea y borra su cuenta
  // en la base dev compartida.
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  ],
  webServer: {
    command: enCI ? "npm run build && npm run start" : "npm run dev",
    url: "http://localhost:3000/ingresar",
    reuseExistingServer: !enCI,
    timeout: 240_000,
  },
});
