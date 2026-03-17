"use client";

import { useEffect, useState } from "react";
import { getConnectedCalendarProviders } from "../actions/get-connected-providers";
import type { ProviderType } from "@/server/services/calendar/calendar-provider-factory";

interface UseConnectedProvidersResult {
  providers: ProviderType[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches which calendar providers the current user has connected
 * so the UI can show a provider selector when multiple are available.
 */
export function useConnectedProviders(): UseConnectedProvidersResult {
  const [providers, setProviders] = useState<ProviderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProviders() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getConnectedCalendarProviders();
        if (!cancelled) {
          if (result?.data?.providers) {
            setProviders(result.data.providers);
          } else {
            const message =
              result?.serverError ?? "Failed to fetch connected providers";
            setError(message);
            console.error(
              "[useConnectedProviders] Failed to fetch providers:",
              message,
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Unknown error fetching providers";
          setError(message);
          console.error("[useConnectedProviders] Error:", message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  return { providers, isLoading, error };
}
