import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { archivosDelUsuario, borrarSiQuedo, enlaceDeConfirmacion, existeUsuario } from "./ayudantes";

// Dirección de prueba de Resend: el envío es real, pero no le llega a nadie.
const email = `delivered+e2e-${Date.now()}@resend.dev`;
const contrasena = `e2e-${randomUUID()}`;
// PNG de 1×1: alcanza para subirlo como comprobante (CU-11) y ver que se carga.
const comprobante = {
  name: "comprobante.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
};
// La fecha del trabajo: hoy, en Argentina (fechaDeHoy), como la pide el campo (aaaa-mm-dd).
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

test.afterAll(async () => {
  await borrarSiQuedo(email);
});

test("propietario: cuenta, vehículo, kilometraje, trabajos y baja", async ({ page }) => {
  let usuarioId = "";
  let ficha = "";

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

  await test.step("CU-05: agregar un Ford Ka 2014, guiado por ser el primero", async () => {
    // Bienvenida del primer auto (spec 2026-10-16): los tres pasos antes de cargarlo.
    await expect(page.getByRole("heading", { name: "Empecemos por tu auto" })).toBeVisible();
    await page.getByRole("link", { name: "Cargar mi auto" }).click();
    await expect(page.getByText("Paso 1 de 3 · Tu auto")).toBeVisible();
    await page.getByLabel("Marca").selectOption({ label: "Ford" });
    await page.getByLabel("Modelo").selectOption({ label: "Ka" });
    await page.getByLabel("Año").selectOption("2014");
    await page.getByLabel("Kilometraje actual").fill("45000");
    await page.getByRole("button", { name: "Seguir" }).click();
    // CU-05 → CU-06: con 45.000 km se supusieron aceite, pastillas, amortiguadores y neumáticos.
    await expect(page.getByRole("heading", { name: "Confirmar datos" })).toBeVisible();
    await expect(page.getByText("Paso 2 de 3 · Lo que ya se hizo")).toBeVisible();
    await expect(page.getByText(/^Como cargaste el Ford Ka con 45\.000 km/)).toBeVisible();
    await page.getByRole("button", { name: /^Neumáticos/ }).click();
    // La pregunta dice el km supuesto y, por ser una revisión, que revisar sin cambiar cuenta.
    await expect(page.getByText("¿Hiciste la revisión cerca de los 30.000 km?")).toBeVisible();
    await expect(page.getByText("Si lo revisaron y estaba bien, también cuenta.")).toBeVisible();
    await page.getByLabel("¿Cuándo se hizo?").fill("2026-01-15");
    // Vista previa calculada con el motor: 30.000 + 15.000 km ya se cumplieron con 45.000.
    const previa = page.getByRole("status").filter({ hasText: "Con ese dato: venció a los 45.000 km." });
    await expect(previa.getByText("Vencido")).toBeVisible();
    await page.getByRole("button", { name: "Sí, se hizo" }).click();
    await expect(page.getByRole("button", { name: /^Neumáticos/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Más tarde" }).click();
    await expect(page.getByRole("heading", { name: "Ford Ka 2014" })).toBeVisible();
    // Paso 3: el aviso explica cómo leer la ficha y "Entendido" lo cierra.
    await expect(page.getByText("Paso 3 de 3 · Tu ficha")).toBeVisible();
    await page.getByRole("link", { name: "Entendido" }).click();
    await expect(page.getByText("Paso 3 de 3 · Tu ficha")).toHaveCount(0);
    ficha = new URL(page.url()).pathname;
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

  const aceite = page.getByRole("listitem").filter({ hasText: "Aceite y filtro de aceite" });

  await test.step("CU-10 y CU-11: registrar el cambio de aceite con su comprobante", async () => {
    await page.goto(ficha);
    // Con el dato a confirmar, la fila lleva a Confirmar datos con ese ítem abierto.
    await aceite.getByRole("link", { name: "Aceite y filtro de aceite", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Confirmar datos" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Aceite y filtro de aceite/ })).toHaveAttribute("aria-expanded", "true");
    await page.goto(ficha);
    // Próximo y sin duda (la correa, desde los 82.000 km): la fila lleva a registrar.
    await expect(
      page.getByRole("listitem").filter({ hasText: "Correa auxiliar" }).getByRole("link", { name: "Correa auxiliar" }),
    ).toHaveAttribute("href", /\/registrar\?item=\d+$/);
    // El enlace secundario abre el formulario con ese ítem ya elegido.
    await aceite.getByRole("link", { name: "Registrar trabajo de Aceite y filtro de aceite" }).click();
    await expect(page.getByRole("heading", { name: "Registrar trabajo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Del plan" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Trabajo", { exact: true }).locator("option:checked")).toHaveText(
      "Aceite y filtro de aceite",
    );
    await page.getByLabel("Fecha").fill(hoy);
    await page.getByLabel("Kilometraje").fill("82000");
    await page.getByLabel("Taller").fill("Lubricentro e2e");
    await page.getByLabel("Costo").fill("45000");
    await page.getByLabel("Comprobante").setInputFiles(comprobante);
    await expect(page.getByText("comprobante.png")).toBeVisible();
    await page.getByRole("button", { name: "Guardar trabajo" }).click();
    // CU-10 paso 7: el registro reinicia el conteo del ítem (resultado verificable de la Tabla 8).
    await expect(page.getByRole("heading", { name: "Ford Ka 2014" })).toBeVisible();
    await expect(
      page.getByText("Con el trabajo registrado cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora al día."),
    ).toBeVisible();
    await expect(aceite.getByText("Al día")).toBeVisible();
    await expect(aceite.getByText("Vencido")).toHaveCount(0);
    await expect(aceite.getByText("A confirmar")).toHaveCount(0);
    expect(await archivosDelUsuario(usuarioId)).toBe(1);
    // Al día: la fila lleva al último trabajo del ítem, y "Volver" regresa a la ficha.
    await aceite.getByRole("link", { name: "Aceite y filtro de aceite", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Aceite y filtro de aceite" })).toBeVisible();
    await expect(page.getByText("Lubricentro e2e")).toBeVisible();
    await page.getByRole("link", { name: "Volver" }).click();
    await expect(page.getByRole("heading", { name: "Ford Ka 2014" })).toBeVisible();
  });

  const filaAceite = page.getByRole("link").filter({ hasText: "Aceite y filtro de aceite" });

  await test.step("CU-13: el trabajo aparece en el historial con su comprobante", async () => {
    await page.getByRole("link", { name: "Historial" }).click();
    await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
    await expect(filaAceite.getByRole("img", { name: "Con comprobante" })).toBeVisible();
    // El supuesto confirmado en el alta aparece como dato del alta (spec 3.3).
    await expect(
      page.getByRole("link").filter({ hasText: "Neumáticos" }).getByText("Dato del alta, confirmado por vos"),
    ).toBeVisible();
    await filaAceite.click();
    await expect(page.getByRole("heading", { name: "Aceite y filtro de aceite" })).toBeVisible();
    await expect(page.getByText("82.000 km", { exact: true })).toBeVisible();
    // RF-15: la imagen llega por el enlace firmado y se carga de verdad.
    const imagen = page.getByRole("img", { name: "Comprobante de Aceite y filtro de aceite" });
    await expect(imagen).toBeVisible();
    await expect.poll(() => imagen.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  });

  await test.step("CU-12: eliminar el trabajo y su comprobante", async () => {
    await page.getByRole("button", { name: "Eliminar trabajo" }).click();
    await expect(dialogo.getByRole("heading", { name: "¿Eliminar este trabajo?" })).toBeVisible();
    await dialogo.getByRole("button", { name: "Eliminar trabajo" }).click();
    await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
    await expect(filaAceite).toHaveCount(0);
    expect(await archivosDelUsuario(usuarioId)).toBe(0);
    // El cálculo vuelve al supuesto del alta.
    await page.goto(ficha);
    await expect(aceite.getByText("Vencido")).toBeVisible();
    await expect(aceite.getByText("A confirmar")).toBeVisible();
  });

  await test.step("RF-14: registrar otro trabajo con comprobante", async () => {
    await page.getByRole("link", { name: "Registrar trabajo", exact: true }).click();
    await page.getByRole("button", { name: "Otro trabajo" }).click();
    await page.getByLabel("Descripción").fill("Lavado de tapizados");
    await page.getByLabel("Fecha").fill(hoy);
    await page.getByLabel("Kilometraje").fill("82000");
    await page.getByLabel("Comprobante").setInputFiles(comprobante);
    await page.getByRole("button", { name: "Guardar trabajo" }).click();
    await expect(page.getByRole("heading", { name: "Ford Ka 2014" })).toBeVisible();
    await page.getByRole("link", { name: "Historial" }).click();
    await expect(page.getByRole("link").filter({ hasText: "Lavado de tapizados" })).toBeVisible();
    // Queda guardado: el paso de la cuenta comprueba que su eliminación vacía la carpeta.
    expect(await archivosDelUsuario(usuarioId)).toBe(1);
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
    // Borra los comprobantes y después la cuenta en cascada: con la base dev compartida por otro job
    // del CI tardó más de 15 s (main, 15/10/2026).
    await expect(page).toHaveURL(/\/ingresar\?cuenta=eliminada/, { timeout: 45_000 });
    expect(await existeUsuario(usuarioId)).toBe(false);
    // RF-04: la cuenta se va con sus comprobantes.
    expect(await archivosDelUsuario(usuarioId)).toBe(0);
  });
});
