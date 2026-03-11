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

// Type for the Navigation API (Chrome 102+, Edge 102+)
// Not yet in TypeScript's lib.dom.d.ts
interface NavigateEvent {
  canIntercept: boolean;
  hashChange: boolean;
  downloadRequest: string | null;
  destination: { url: string };
  preventDefault: () => void;
}

interface AppNavigation {
  addEventListener(
    type: "navigate",
    listener: (event: NavigateEvent) => void,
  ): void;
  removeEventListener(
    type: "navigate",
    listener: (event: NavigateEvent) => void,
  ): void;
}

/**
 * Intercepts navigation attempts when enabled and shows a confirmation dialog.
 *
 * Uses three complementary strategies:
 * 1. Navigation API (Chrome/Edge 102+) — intercepts all navigation including
 *    Next.js client-side routing, which captures history.pushState at module
 *    load time (before our effects run), making monkey-patching ineffective.
 * 2. beforeunload — browser-native dialog for hard navigation (refresh, close tab).
 * 3. popstate — catches browser back/forward buttons.
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

    // --- Strategy 1: Navigation API (modern browsers) ---
    // This is the only reliable way to intercept Next.js App Router
    // client-side navigation, since Next.js captures history.pushState
    // at module load time before any useEffect can monkey-patch it.
    const navigation =
      "navigation" in window
        ? (window.navigation as AppNavigation)
        : null;

    const handleNavigate = (e: NavigateEvent) => {
      if (!enabledRef.current) return;
      if (!e.canIntercept) return; // cross-origin — can't intercept
      if (e.hashChange) return; // hash-only changes are fine
      if (e.downloadRequest) return; // file downloads are fine

      const targetUrl = new URL(e.destination.url).pathname;
      const currentUrl = window.location.pathname;

      // Allow same-page navigation (query param changes, etc.)
      if (targetUrl === currentUrl) return;

      e.preventDefault();
      pendingUrlRef.current = targetUrl;
      queueMicrotask(() => setShowDialog(true));
    };

    navigation?.addEventListener("navigate", handleNavigate);

    // --- Strategy 2: beforeunload (hard navigation: refresh, close tab) ---
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for Chrome/Safari to show the native dialog
      e.returnValue = "";
    };

    // --- Strategy 3: popstate (browser back/forward) ---
    const handlePopState = () => {
      if (!enabledRef.current) return;

      // Push current URL back onto the stack to undo the navigation
      window.history.pushState(null, "", window.location.href);
      pendingUrlRef.current = "back";
      queueMicrotask(() => setShowDialog(true));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      navigation?.removeEventListener("navigate", handleNavigate);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled]);

  const confirmNavigation = () => {
    setShowDialog(false);
    onConfirmNavigation?.();

    const url = pendingUrlRef.current;
    pendingUrlRef.current = null;

    // Temporarily disable the guard so the actual navigation goes through
    enabledRef.current = false;

    if (url === "back") {
      window.history.back();
    } else if (url) {
      // Full page navigation to ensure clean state
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
