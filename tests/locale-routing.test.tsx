import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderApp } from "./render";

it("uses Spanish on a direct expert link and explains the redirect in simple mode", async () => {
  document.cookie = "dex-locale=es; Path=/";
  renderApp("/performance");
  expect(await screen.findByRole("heading", { level: 1, name: "Resumen" })).toBeTruthy();
  expect(screen.getByText("Esta página requiere el modo Experto. Estás viendo el resumen.")).toBeTruthy();
  expect(document.documentElement.lang).toBe("es");
  expect(screen.queryByRole("link", { name: "Rendimiento" })).toBeNull();
});
