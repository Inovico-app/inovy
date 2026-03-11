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
 *
 * Uses three complementary strategies:
 * 1. Click capture (capture phase) — intercepts <a> tag clicks before Next.js
 *    handles them. This is the only reliable way to block Next.js App Router
 *    client-side navigation since it captures history.pushState at module load
 *    time and the Navigation API's preventDefault doesn't reliably block it.
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

    // --- Strategy 1: Click capture on <a> tags ---
    // Runs in capture phase so it fires before Next.js's Link click handler.
    // Next.js checks e.defaultPrevented before navigating, so preventDefault()
    // is sufficient to block the client-side route transition.
    const handleLinkClick = (e: MouseEvent) => {
      if (!enabledRef.current) return;

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip external links, anchors, mailto, tel, etc.
      if (/^(https?:|mailto:|tel:|#)/.test(href)) return;

      // Skip if modifier keys are held (user wants new tab/window)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Skip same-page navigation
      if (href === window.location.pathname) return;

      // Block the click so Next.js never sees it
      e.preventDefault();
      e.stopPropagation();

      pendingUrlRef.current = href;
      setShowDialog(true);
    };

    // --- Strategy 2: beforeunload (hard navigation: refresh, close tab) ---
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for Chrome/Safari to show the native "Leave site?" dialog
      e.returnValue = "";
    };

    // --- Strategy 3: popstate (browser back/forward) ---
    const handlePopState = () => {
      if (!enabledRef.current) return;

      // Push current URL back onto the stack to undo the back/forward
      window.history.pushState(null, "", window.location.href);
      pendingUrlRef.current = "back";
      setShowDialog(true);
    };

    // Use capture phase (third arg = true) to run before Next.js handlers
    document.addEventListener("click", handleLinkClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled]);

  const confirmNavigation = () => {
    setShowDialog(false);
    onConfirmNavigation?.();

    const url = pendingUrlRef.current;
    pendingUrlRef.current = null;

    // Disable the guard so navigation goes through
    enabledRef.current = false;

    if (url === "back") {
      window.history.back();
    } else if (url) {
      // Use full page navigation for clean state reset
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
