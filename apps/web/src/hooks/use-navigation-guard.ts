"use client";

import { useEffect, useRef, useState } from "react";

interface UseNavigationGuardOptions {
  /** Whether the guard is active (e.g., only when recording) */
  enabled: boolean;
  /** Called when navigation is confirmed by the user */
  onConfirmNavigation?: () => void;
}

interface UseNavigationGuardReturn {
  /** Whether the confirmation dialog should be shown */
  showDialog: boolean;
  /** Call to confirm navigation (cleanup + navigate) */
  confirmNavigation: () => void;
  /** Call to cancel navigation (stay on page) */
  cancelNavigation: () => void;
}

/**
 * Intercepts navigation attempts when enabled and shows a confirmation dialog.
 * Handles both browser navigation (beforeunload) and Next.js client-side routing
 * (history.pushState/replaceState interception).
 */
export function useNavigationGuard({
  enabled,
  onConfirmNavigation,
}: UseNavigationGuardOptions): UseNavigationGuardReturn {
  const [showDialog, setShowDialog] = useState(false);
  const pendingUrlRef = useRef<string | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) {
      setShowDialog(false);
      pendingUrlRef.current = null;
      return;
    }

    // Handle browser navigation (refresh, close tab, back/forward to external)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    // Intercept history.pushState (Next.js client-side navigation)
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    const interceptNavigation = (
      original: typeof history.pushState,
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) => {
      if (!enabledRef.current || !url) {
        original(data, unused, url);
        return;
      }

      const targetUrl = url.toString();
      const currentUrl = window.location.pathname;

      // Allow navigation to the same page (e.g., query param changes)
      if (targetUrl === currentUrl) {
        original(data, unused, url);
        return;
      }

      // Block navigation and show dialog (deferred to escape synchronous
      // pushState/replaceState context where React state updates are forbidden)
      pendingUrlRef.current = targetUrl;
      queueMicrotask(() => setShowDialog(true));
    };

    history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
      interceptNavigation(originalPushState, data, unused, url);
    };

    history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
      interceptNavigation(originalReplaceState, data, unused, url);
    };

    // Handle browser back/forward button
    const handlePopState = () => {
      if (!enabledRef.current) return;

      // Push current URL back to prevent the navigation
      history.pushState(null, "", window.location.href);
      pendingUrlRef.current = "back";
      queueMicrotask(() => setShowDialog(true));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [enabled]);

  const confirmNavigation = () => {
    setShowDialog(false);
    onConfirmNavigation?.();

    const url = pendingUrlRef.current;
    pendingUrlRef.current = null;

    // Temporarily disable the guard to allow navigation through
    enabledRef.current = false;

    if (url === "back") {
      history.back();
    } else if (url) {
      // Use the real pushState (which we've monkey-patched, but enabledRef is false)
      window.location.href = url;
    }
  };

  const cancelNavigation = () => {
    setShowDialog(false);
    pendingUrlRef.current = null;
  };

  return {
    showDialog,
    confirmNavigation,
    cancelNavigation,
  };
}
