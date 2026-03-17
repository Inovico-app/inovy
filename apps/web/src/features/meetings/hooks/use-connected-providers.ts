"use client";

import { useEffect, useState } from "react";
import { getConnectedCalendarProviders } from "../actions/get-connected-providers";
import type { ProviderType } from "@/server/services/calendar/calendar-provider-factory";

interface UseConnectedProvidersResult {
  providers: ProviderType[];
  isLoading: boolean;
}

/**
 * Fetches which calendar providers the current user has connected
 * so the UI can show a provider selector when multiple are available.
 */
export function useConnectedProviders(): UseConnectedProvidersResult {
  const [providers, setProviders] = useState<ProviderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProviders() {
      setIsLoading(true);
      try {
        const result = await getConnectedCalendarProviders();
        if (!cancelled) {
          setProviders(result?.data?.providers ?? []);
        }
      } catch {
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  return { providers, isLoading };
}
