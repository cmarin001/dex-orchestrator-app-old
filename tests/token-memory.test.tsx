import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { setSession } from "../src/api/client";
import { origin, token } from "./fixtures";

it("reloads a connected tab at Connect without recovering or persisting a bearer", async () => {
  setSession({ kind: "connected", origin, token });
  expect(document.cookie).not.toContain(token);
  expect(JSON.stringify(sessionStorage)).not.toContain(token);
  expect(JSON.stringify(localStorage)).not.toContain(token);
  expect(location.href).not.toContain(token);
  vi.resetModules();
  const { getSession } = await import("../src/api/client");
  expect(getSession()).toEqual({ kind: "connect" });
  const { renderApp } = await import("./render");
  renderApp("/positions");
  const field = await screen.findByLabelText("Dashboard access token") as HTMLInputElement;
  expect(field.value).toBe("");
});
