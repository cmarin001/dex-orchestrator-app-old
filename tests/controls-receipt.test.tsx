import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { origin, receipt } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

it("confirms pause, displays queued, and resubmits the same request ID until applied", async () => {
  const requests: unknown[] = [];
  server.use(http.post(origin + "/api/v1/controls/pause", async ({ request }) => {
    const body = await request.json() as { request_id: string };
    requests.push(body);
    return HttpResponse.json(receipt(body.request_id, requests.length === 1 ? "queued" : "applied"),
      { status: requests.length === 1 ? 202 : 200 });
  }));
  renderApp("/controls", { connected: true });
  const pause = await screen.findByRole("button", { name: "Pause entries" }) as HTMLButtonElement;
  await waitFor(() => expect(pause.disabled).toBe(false));
  fireEvent.click(pause);
  const modal = await screen.findByRole("dialog");
  expect(within(modal).getByText("Entries enabled")).toBeTruthy();
  expect(requests).toHaveLength(0);
  fireEvent.click(within(modal).getByRole("button", { name: "Confirm request" }));
  expect(await screen.findByText("Queued")).toBeTruthy();
  expect(screen.getByText("Pending")).toBeTruthy();
  expect(screen.queryByText("Applied")).toBeNull();
  const id = (requests[0] as { request_id: string }).request_id;
  expect(screen.getByText(id)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Check receipt" }));
  expect(await screen.findByText("Applied")).toBeTruthy();
  expect(requests).toEqual([{ request_id: id }, { request_id: id }]);
  expect(screen.getByRole("link", { name: "View application in audit" }).getAttribute("href")).toBe("/audit?request=" + id);
});
