import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { audit, origin } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

it("requests the next audit cursor only when the operator asks for older results", async () => {
  const cursors: (string | null)[] = [];
  server.use(http.get(origin + "/api/v1/audit", ({ request }) => {
    const cursor = new URL(request.url).searchParams.get("cursor");
    cursors.push(cursor);
    if (cursor === null) return HttpResponse.json({ ...audit, next_cursor: 17 });
    return HttpResponse.json({ items: [{ ...audit.items[0], stage: "older_stage", detail: "exact backend note" }], next_cursor: null });
  }));
  renderApp("/audit", { expert: true, connected: true });
  const more = await screen.findByRole("button", { name: "Load older results" });
  expect(cursors).toEqual([null]);
  fireEvent.click(more);
  expect(await screen.findByText("older_stage")).toBeTruthy();
  expect(cursors).toEqual([null, "17"]);
});
