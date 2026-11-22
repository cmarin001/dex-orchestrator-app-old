import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect, it, vi } from "vitest";
import { renderApp } from "./render";
import { server } from "./server";


afterEach(() => vi.unstubAllEnvs());

it("restores the BFF session, reads without bearer or browser storage, and signs out", async () => {
  vi.stubEnv("VITE_DASHBOARD_AUTH_MODE", "auth0");
  let signedIn = true;
  const origin = window.location.origin;
  const reads = vi.fn();
  server.use(
    http.get(origin + "/auth/me", () => HttpResponse.json({ authenticated: signedIn })),
    http.post(origin + "/auth/logout", ({ request }) => {
      expect(request.headers.get("X-Dex-CSRF")).toBe("1");
      expect(request.credentials).toBe("same-origin");
      signedIn = false;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(origin + "/api/v1/:resource", ({ request }) => {
      reads(request.credentials, request.headers.get("Authorization"));
      return HttpResponse.json({ status: "ok", journal_readable: true });
    }),
  );
  renderApp("/connect");
  await waitFor(() => expect(reads).toHaveBeenCalledWith("same-origin", null));
  fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeTruthy();
  expect(sessionStorage.getItem("dex-connection-view")).toBeNull();
  expect(screen.queryByText("Bearer token")).toBeNull();
  expect(reads).toHaveBeenCalledWith("same-origin", null);
});
