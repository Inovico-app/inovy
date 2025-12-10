import { ConsentBanner } from "@/features/recordings/components/consent-banner";

interface ConsentManagerProps {
  showConsentBanner: boolean;
  onConsentGranted: () => void;
  onConsentDenied: () => void;
}

export function ConsentManager({
  showConsentBanner,
  onConsentGranted,
  onConsentDenied,
}: ConsentManagerProps) {
  return (
    <ConsentBanner
      isOpen={showConsentBanner}
      onConsentGranted={onConsentGranted}
      onConsentDenied={onConsentDenied}
    />
  );
}

