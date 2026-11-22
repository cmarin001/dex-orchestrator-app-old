import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { origin } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

it("shows wallet tiers, balances, and only offers a deposit address for verified signers", async () => {
  server.use(http.get(origin + "/api/v1/wallets", () => HttpResponse.json({ wallets: [
    { chain: "base", address: "base-address", tier: "fundable", fundable: true, balance: "0.05", currency: "ETH" },
    { chain: "solana", address: "solana-address", tier: "fundable", fundable: false, balance: null, currency: "SOL" },
    { chain: "bitcoin_taproot", address: "taproot-address", tier: "validation_only", fundable: false, balance: "0", currency: "BTC" },
    { chain: "arc", address: "arc-address", tier: "tracked", fundable: false, balance: null, currency: "" },
  ] })));
  renderApp("/wallets", { connected: true });
  const base = (await screen.findByRole("heading", { name: "Base" })).closest("section")!;
  expect(within(base).getByText("0.05 ETH")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Copy deposit address" })).toHaveLength(1);
  expect(screen.getByText("Verify the signer before funding")).toBeTruthy();
  expect(screen.getAllByText("Funding unavailable for this chain")).toHaveLength(2);
  expect(screen.getByText("taproot-address")).toBeTruthy();
  expect(screen.getByText("arc-address")).toBeTruthy();
});
