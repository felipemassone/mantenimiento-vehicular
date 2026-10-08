import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { borrarSiQuedo, enlaceDeConfirmacion, existeUsuario } from "./ayudantes";

// Dirección de prueba de Resend: el envío es real, pero no le llega a nadie.
const email = `delivered+e2e-${Date.now()}@resend.dev`;
const contrasena = `e2e-${randomUUID()}`;

test.afterAll(async () => {
  await borrarSiQuedo(email);
});

test("propietario: cuenta, vehículo, kilometraje y baja", async ({ page }) => {
  let usuarioId = "";

  await test.step("CU-01: crear la cuenta y confirmarla", async () => {
    await page.goto("/crear-cuenta");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Revisá tu correo" })).toBeVisible();

    const enlace = await enlaceDeConfirmacion(email, contrasena);
    usuarioId = enlace.usuarioId;
    await page.goto(enlace.ruta);
    await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();
  });

  await test.step("CU-02: cerrar sesión e ingresar", async () => {
    await page.getByRole("link", { name: "Mi cuenta" }).click();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Ingresar" })).toBeVisible();
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();
  });

  await test.step("CU-05: agregar un Ford Ka 2014", async () => {
    await page.getByRole("link", { name: "Agregar vehículo" }).click();
    await page.getByLabel("Marca").selectOption({ label: "Ford" });
    await page.getByLabel("Modelo").selectOption({ label: "Ka" });
    await page.getByLabel("Año").selectOption("2014");
    await page.getByLabel("Kilometraje actual").fill("45000");
    await page.getByRole("button", { name: "Agregar vehículo" }).click();
    await expect(page.getByRole("heading", { name: "Ford Ka 2014" })).toBeVisible();
    await expect(page.getByText("45.000 km", { exact: true })).toBeVisible();
  });

  const dialogo = page.getByRole("dialog");

  await test.step("CU-08: actualizar el kilometraje", async () => {
    await page.getByRole("button", { name: "Actualizar kilometraje" }).click();
    await dialogo.getByLabel("Kilometraje actual").fill("47500");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText("47.500 km", { exact: true })).toBeVisible();
  });

  await test.step("CU-08 4a: rechazar una lectura menor", async () => {
    await page.getByRole("button", { name: "Actualizar kilometraje" }).click();
    await dialogo.getByLabel("Kilometraje actual").fill("47000");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo.getByText("No puede ser menor a 47.500 km, la última lectura.")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await test.step("Un propietario no ve la administración", async () => {
    const respuesta = await page.goto("/admin");
    expect(respuesta?.status()).toBe(404);
  });

  await test.step("CU-04: eliminar la cuenta", async () => {
    await page.goto("/cuenta");
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
    await dialogo.getByLabel("Ingresá tu contraseña para confirmar").fill(contrasena);
    await dialogo.getByRole("button", { name: "Eliminar cuenta" }).click();
    await expect(page).toHaveURL(/\/ingresar\?cuenta=eliminada/);
    expect(await existeUsuario(usuarioId)).toBe(false);
  });
});
