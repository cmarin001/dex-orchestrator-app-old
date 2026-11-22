import { useCallback, useSyncExternalStore } from "react";

function useMedia(query: string) {
  const subscribe = useCallback((callback: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export const useMobile = () => useMedia("(max-width: 47.99rem)");
export const useTablet = () => useMedia("(min-width: 48rem) and (max-width: 79.99rem)");
