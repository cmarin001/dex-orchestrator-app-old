import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnection } from "../app/Connection";
import { retryDelay } from "../lib/retry";
import { ApiError, request } from "./client";
import type { Command, Controls, Receipt } from "./types";
import type { OperationCommand, OperationReceipt } from "../features/controls/operations";

type DeskCommand = Command | OperationCommand;
type DeskReceipt = Receipt | OperationReceipt;

const receiptInterval = 5000;
export type Tracked = {
  id: string; command: DeskCommand; scope: string; receipt?: DeskReceipt;
  checking: boolean; dismissed?: boolean; error?: unknown; nextCheck?: number; failures: number;
};
type CommandContext = {
  items: Tracked[]; submit: (command: DeskCommand, scope: string) => void;
  check: (item: Tracked) => void; dismiss: (id: string) => void;
};
const Context = createContext<CommandContext | null>(null);

async function send({ id, command, signal }: { id: string; command: DeskCommand; signal: AbortSignal }) {
  if (command.type === "operation") {
    const receipt = await request<OperationReceipt>("/api/v1" + command.path, {
      method: "POST", body: JSON.stringify({ ...command.payload, request_id: id }), signal,
    });
    if (receipt?.request_id !== id || !["queued", "applied", "rejected"].includes(receipt.state) ||
      typeof receipt.actor !== "string" || !Array.isArray(receipt.gaps)) throw new ApiError(0, "invalid_response_data");
    return receipt;
  }
  const receipt = await request<Receipt>("/api/v1/controls/" + command.type, {
    method: "POST", body: JSON.stringify({ ...command.payload, request_id: id }), signal,
  });
  if (receipt?.request_id !== id || !["queued", "applied", "rejected"].includes(receipt.state) ||
    typeof receipt.actor !== "string" || receipt.action?.type !== command.type || !Array.isArray(receipt.gaps)) {
    throw new ApiError(0, "invalid_response_data");
  }
  return receipt;
}

const uncertain = (error: unknown) =>
  error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500);

export function CommandProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Tracked[]>([]);
  const busy = useRef(new Map<string, AbortController>());
  const { generation, session } = useConnection();
  const query = useQueryClient();
  const { mutateAsync } = useMutation({ mutationFn: send });
  useEffect(() => {
    const requests = busy.current;
    return () => { for (const abort of requests.values()) abort.abort(); requests.clear(); };
  }, []);
  const patch = (id: string, patch: Partial<Tracked>) =>
    setItems(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item));

  const check = (item: Tracked) => {
    if (session.kind !== "connected" || busy.current.has(item.id) || item.dismissed) return;
    const controller = new AbortController();
    busy.current.set(item.id, controller);
    patch(item.id, { checking: true, error: undefined, nextCheck: undefined });
    void mutateAsync({ id: item.id, command: item.command, signal: controller.signal }).then(receipt => {
      if (controller.signal.aborted) return;
      const queued = receipt.state === "queued";
      patch(item.id, { receipt, checking: false, failures: 0, nextCheck: queued ? Date.now() + receiptInterval : undefined });
      if (!queued) {
        if (item.command.type === "operation") {
          void query.invalidateQueries({ queryKey: [generation, "/api/v1/" + item.command.resource] });
        }
        for (const path of ["/api/v1/status", "/api/v1/positions", "/api/v1/risk", "/api/v1/candidates"]) {
          void query.invalidateQueries({ queryKey: [generation, path] });
        }
      }
    }).catch(error => {
      if (controller.signal.aborted) return;
      const failures = item.failures + 1;
      // An acknowledged command can be checked safely after transient failures.
      // An unconfirmed initial delivery needs an explicit retry from the operator.
      const nextCheck = item.receipt?.state === "queued" && uncertain(error)
        ? Date.now() + receiptInterval + retryDelay(failures) : undefined;
      patch(item.id, { error, checking: false, failures, nextCheck });
    }).finally(() => { busy.current.delete(item.id); });
  };

  useEffect(() => {
    const active = items.filter(item => !item.dismissed && item.nextCheck !== undefined);
    if (!active.length) return;
    const scheduled = Math.min(...active.map(item => item.nextCheck!));
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      for (const item of active) if (item.nextCheck! <= now) check(item);
    };
    const timer = setTimeout(refresh, Math.max(0, scheduled - Date.now()));
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", refresh); };
  });

  return createElement(Context.Provider, { value: {
    items, check, dismiss: id => patch(id, { dismissed: true }),
    submit(command, scope) {
      if (session.kind !== "connected") return;
      const item: Tracked = { id: crypto.randomUUID(), command, scope, checking: true, failures: 0 };
      setItems(previous => [item, ...previous]);
      check(item);
    },
  } }, children);
}
export function useCommands() {
  const context = useContext(Context);
  if (!context) throw new Error("Command provider is missing");
  return context;
}

export const isPending = (item: Tracked) => !item.dismissed && (
  item.receipt?.state === "queued" || (!item.receipt && (item.checking || uncertain(item.error)))
);

function useControl<K extends keyof Controls>(type: K) {
  const { submit } = useCommands();
  return (payload: Controls[K], scope: string = type) => submit({ type, payload } as Command, scope);
}
export const usePause = () => useControl("pause");
export const useResume = () => useControl("resume");
export const useRiskUpdate = () => useControl("risk");
export const useExit = () => useControl("exit");
export const useReject = () => useControl("reject");
export const useLiveExecution = () => useControl("live-execution");
