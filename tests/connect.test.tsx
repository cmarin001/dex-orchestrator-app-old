import { fireEvent, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { getSession } from "../src/api/client";
import { origin, token } from "./fixtures";
import { renderApp } from "./render";

it("connects over REST with a bearer and disconnects without sending it in a URL", async () => {
  renderApp("/connect", { expert: true });
  fireEvent.change(await screen.findByLabelText("Dashboard access token"), { target: { value: token } });
  expect((screen.getByLabelText("Backend origin") as HTMLInputElement).value).toBe(origin);
  fireEvent.click(screen.getByRole("button", { name: "Connect to backend" }));
  expect(await screen.findByText("$1,250.00")).toBeTruthy();
  expect(getSession()).toMatchObject({ kind: "connected", token });
  fireEvent.click(screen.getByRole("link", { name: "Settings" }));
  fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
  expect(await screen.findByLabelText("Dashboard access token")).toBeTruthy();
  expect(getSession()).toEqual({ kind: "connect" });
  expect(location.href).not.toContain(token);
});
