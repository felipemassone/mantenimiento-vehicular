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
    // CU-05 → CU-06: con 45.000 km se supusieron aceite, pastillas, amortiguadores y neumáticos.
    await expect(page.getByRole("heading", { name: "Confirmar datos" })).toBeVisible();
    await expect(page.getByText(/^Como cargaste el Ford Ka con 45\.000 km/)).toBeVisible();
    await page.getByRole("button", { name: /^Neumáticos/ }).click();
    await page.getByLabel("¿Cuándo se hizo?").fill("2026-01-15");
    await page.getByRole("button", { name: "Sí, se hizo" }).click();
    await expect(page.getByRole("button", { name: /^Neumáticos/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Más tarde" }).click();
    await expect(page.getByRole("heading", { name: "Ford Ka 2014" })).toBeVisible();
    await expect(page.getByText("45.000 km", { exact: true })).toBeVisible();
    // CU-09: con 45.000 km de alta, el aceite (cada 15.000) queda supuesto a los 30.000 y vencido.
    await expect(page.getByRole("heading", { name: "Mantenimiento" })).toBeVisible();
    const aceite = page.getByRole("listitem").filter({ hasText: "Aceite y filtro de aceite" });
    await expect(aceite.getByText("Vencido")).toBeVisible();
    await expect(aceite.getByText("A confirmar")).toBeVisible();
    const neumaticos = page.getByRole("listitem").filter({ hasText: "Neumáticos" });
    await expect(neumaticos).toHaveCount(1);
    await expect(neumaticos.getByText("A confirmar")).toHaveCount(0);
  });

  const dialogo = page.getByRole("dialog");

  await test.step("CU-08: actualizar el kilometraje", async () => {
    await page.getByRole("button", { name: "Actualizar kilometraje" }).click();
    await dialogo.getByLabel("Kilometraje actual").fill("82000");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText("82.000 km", { exact: true })).toBeVisible();
    // CU-08 paso 7 (mockup 14): el aviso nombra lo que cambió, y no vuelve al recargar.
    await expect(
      page.getByText(
        "Con 82.000 km cambió el estado de 2 ítems: Correa auxiliar, ahora próximo; Líquido de enfriamiento, ahora próximo.",
      ),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText(/^Con 82\.000 km cambió/)).toHaveCount(0);
  });

  await test.step("CU-08 4a: rechazar una lectura menor", async () => {
    await page.getByRole("button", { name: "Actualizar kilometraje" }).click();
    await dialogo.getByLabel("Kilometraje actual").fill("81000");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo.getByText("No puede ser menor a 82.000 km, la última lectura.")).toBeVisible();
    await page.keyboard.press("Escape");
    // Mockup 04: la tarjeta del vehículo resume su estado.
    await page.getByRole("link", { name: "Volver" }).click();
    await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();
    await expect(page.getByText(/^\d+ vencidos?$/)).toBeVisible();
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
