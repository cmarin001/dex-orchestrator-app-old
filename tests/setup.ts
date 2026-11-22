import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./server";
import { setSession } from "../src/api/client";

Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn((query: string) => ({
  matches: false, media: query, addListener() {}, removeListener() {},
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
})) });
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  setSession({ kind: "sample" });
  window.history.replaceState(null, "", "/");
  for (const name of ["dex-mode", "dex-theme", "dex-locale"]) document.cookie = name + "=; Max-Age=0; Path=/";
  document.documentElement.lang = "en";
  document.title = "TradeKeel";
});
afterEach(() => { cleanup(); server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());
