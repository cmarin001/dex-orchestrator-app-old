import AtlaskitProvider from "@atlaskit/app-provider";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { setBooleanFeatureFlagResolver } from "@atlaskit/platform-feature-flags";
import { IntlProvider } from "./IntlProvider";
import { ModeController } from "./ModeController";
import { ThemeController } from "./ThemeController";
import { Connection } from "./Connection";
import { retryDelay, retryRead } from "../lib/retry";

// Use Atlaskit defaults without a connection to its internal feature-gate service.
setBooleanFeatureFlagResolver(() => false);

function DesignProvider({ children }: { children: ReactNode }) {
  return <AtlaskitProvider defaultColorMode="auto">
    <ThemeController>{children}</ThemeController>
  </AtlaskitProvider>;
}
export function AppProvider({ children, queryClient }: { children: ReactNode; queryClient?: QueryClient }) {
  const [client] = useState(() => queryClient ?? new QueryClient({ defaultOptions: {
    queries: { retry: retryRead, retryDelay, refetchIntervalInBackground: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  } }));
  useEffect(() => {
    const track = () => focusManager.setFocused(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", track);
    track();
    return () => document.removeEventListener("visibilitychange", track);
  }, []);
  return <IntlProvider><DesignProvider><ModeController><QueryClientProvider client={client}>
    <Connection>{children}</Connection>
  </QueryClientProvider></ModeController></DesignProvider></IntlProvider>;
}
