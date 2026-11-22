import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { getSession } from "../src/api/client";
import { origin, token } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

it("hides expert controls without discarding an already queued command or the token", async () => {
  server.use(http.post(origin + "/api/v1/controls/live-execution", async ({ request }) => {
    const body = await request.json() as { request_id: string; enabled: boolean };
    expect(body.enabled).toBe(true);
    return HttpResponse.json({ request_id: body.request_id, state: "queued", actor: "operator",
      action: { type: "live-execution", enabled: true }, gaps: [] }, { status: 202 });
  }));
  renderApp("/controls", { connected: true, expert: true });
  const arm = await screen.findByRole("button", { name: "Arm live execution" }) as HTMLButtonElement;
  await waitFor(() => expect(arm.disabled).toBe(false));
  fireEvent.click(arm);
  const dialog = within(await screen.findByRole("dialog"));
  const confirm = dialog.getByRole("button", { name: "Confirm request" }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  fireEvent.change(dialog.getByRole("textbox"), { target: { value: "ARM" } });
  fireEvent.click(confirm);
  expect(await screen.findByText("Queued")).toBeTruthy();
  fireEvent.click(screen.getByText("Display preferences"));
  const user = userEvent.setup();
  const toggle = await screen.findByLabelText("Expert mode");
  await user.click(toggle);
  expect(screen.queryByRole("button", { name: "Arm live execution" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Candidates" })).toBeNull();
  expect(getSession()).toMatchObject({ kind: "connected", token });
  await user.click(toggle);
  expect(screen.getByText("Queued")).toBeTruthy();
});
