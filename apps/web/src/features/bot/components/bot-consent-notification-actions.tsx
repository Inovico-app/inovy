import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface BotConsentNotificationActionsProps {
  actionInProgress: "approve" | "deny" | null;
  onApprove: () => void;
  onDeny: () => void;
}

/**
 * Action buttons for bot consent notification
 */
export function BotConsentNotificationActions({
  actionInProgress,
  onApprove,
  onDeny,
}: BotConsentNotificationActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={onApprove}
        disabled={actionInProgress !== null}
        className="flex-1"
      >
        {actionInProgress === "approve" ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Approve"
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onDeny}
        disabled={actionInProgress !== null}
        className="flex-1"
      >
        {actionInProgress === "deny" ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Deny"
        )}
      </Button>
    </div>
  );
}

