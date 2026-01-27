import { ConsentBanner } from "@/features/recordings/components/consent-banner";
import type { Participant } from "@/features/recordings/hooks/use-consent-banner";

interface ConsentManagerProps {
  showConsentBanner: boolean;
  onConsentGranted: (participants: Participant[]) => void;
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

