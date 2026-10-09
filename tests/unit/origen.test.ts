import { describe, expect, it } from "vitest";
import { origenDeLaApp } from "@/lib/origen";

describe("origenDeLaApp", () => {
  it("usa APP_ORIGIN cuando está definida", () => {
    expect(
      origenDeLaApp({ APP_ORIGIN: "https://libreta.example", VERCEL_BRANCH_URL: "rama.vercel.app" }),
    ).toBe("https://libreta.example");
  });

  it("en una vista previa de Vercel usa la URL de la rama, con https", () => {
    expect(origenDeLaApp({ VERCEL_BRANCH_URL: "mantenimiento-vehicular-git-rama.vercel.app" })).toBe(
      "https://mantenimiento-vehicular-git-rama.vercel.app",
    );
  });

  it("sin ninguna de las dos, es el servidor local", () => {
    expect(origenDeLaApp({})).toBe("http://localhost:3000");
  });
});
