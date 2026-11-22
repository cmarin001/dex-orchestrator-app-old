import type { Receipt } from "../../api/types";

export type OperationResource = "mode" | "chain" | "budget" | "providers" | "strategies" | "signals";
export type ConfigResource = Extract<OperationResource, "mode" | "chain" | "budget">;
type TogglePath = `/${"providers" | "strategies"}/${string}/${"enable" | "disable"}`;
type SignalPath = `/controls/${"approve" | "reject"}/${string}`;

export type OperationCommand = { type: "operation"; resource: OperationResource } & (
  | { path: "/mode"; payload: { config: object; reason: string } }
  | { path: "/chain" | "/budget"; payload: { config: object } }
  | { path: `/strategies/${string}/params`; payload: { params: object } }
  | { path: TogglePath | SignalPath | "/strategies/reload"; payload: Record<string, never> }
);

export type OperationReceipt = Omit<Receipt, "action">;

export function operationId(id: string) {
  return /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : null;
}
