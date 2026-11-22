import { useEffect, useState } from "react";
import { useConnection } from "../app/Connection";
import { retryDelay } from "../lib/retry";
import { stream } from "./client";
import type { LiveView } from "./types";

export function useLiveView() {
  const { generation, session } = useConnection();
  const [data, setData] = useState<LiveView[]>([]);
  const [disconnected, setDisconnected] = useState(false);
  const [restart, setRestart] = useState(0);
  useEffect(() => {
    setData([]);
    setDisconnected(false);
  }, [generation]);
  useEffect(() => {
    if (session.kind === "connect") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function connect() {
      try {
        await stream(controller.signal, payload => {
          const views: unknown = JSON.parse(payload);
          if (!Array.isArray(views)) throw new Error("Invalid live-view frame");
          setData(views as LiveView[]);
          setDisconnected(false);
          attempts = 0;
        });
      } catch {
        // On EOF and transport errors, retain the last usable price series.
      }
      if (!controller.signal.aborted) {
        setDisconnected(true);
        timer = setTimeout(connect, retryDelay(++attempts));
      }
    }
    void connect();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [session.kind, generation, restart]);
  return { data, disconnected, reconnect: () => setRestart(value => value + 1) };
}
