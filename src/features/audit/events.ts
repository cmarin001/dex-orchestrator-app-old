import type { JournalEvent, RiskConfig } from "../../api/types";
import type { MessageId } from "../../i18n/messages";

export const stageLabel: Record<string, MessageId> = {
  control: "stageControl", market_discovery: "stageDiscovery", scanner_batch: "stageScanner",
  worker_cycle: "stageWorker", executor: "stageExecution", "equity-curve": "stageEquity", "rug-check": "stageRisk",
};
export const statusLabel: Record<string, MessageId> = {
  ok: "statusOk", skipped: "statusSkipped", skip: "statusSkipped", failed: "statusFailed",
  paper_fill: "statusFill", paper_close: "statusClose", live_fill: "statusLiveFill", live_close: "statusLiveClose",
};
export function controlEvent(event: JournalEvent) {
  if (event.stage !== "control" || !event.detail || typeof event.detail !== "object") return undefined;
  const command = event.detail as { id: string; actor: string; at: number; action: { type: string; config?: RiskConfig } };
  return typeof command.id === "string" && typeof command.action?.type === "string" ? command : undefined;
}
export function eventKey(event: JournalEvent, index: number) {
  return controlEvent(event)?.id ?? [event.at, event.stage, event.identity?.run_id, index].join("-");
}
