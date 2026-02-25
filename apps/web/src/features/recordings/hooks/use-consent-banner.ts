import { useEffect, useRef, useState } from "react";

interface UseConsentBannerProps {
  isOpen: boolean;
  onConsentGranted: () => void;
  onConsentDenied: () => void;
}

export function useConsentBanner({
  isOpen,
  onConsentGranted,
  onConsentDenied,
}: UseConsentBannerProps) {
  const [hasRead, setHasRead] = useState(false);
  const isGrantingConsentRef = useRef(false);
  const prevIsOpenRef = useRef(isOpen);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setHasRead(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle dialog open/close changes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Only call onConsentDenied if consent is not being granted
      if (!isGrantingConsentRef.current) {
        onConsentDenied();
      }
      // Reset the flag after handling the close
      isGrantingConsentRef.current = false;
    }
  };

  // Handle consent granted
  const handleConsentGranted = () => {
    // Set flag FIRST to prevent onConsentDenied from being called
    isGrantingConsentRef.current = true;
    // Call the parent handler - it will set isOpen to false
    onConsentGranted();
  };

  return {
    hasRead,
    setHasRead,
    handleOpenChange,
    handleConsentGranted,
  };
}
