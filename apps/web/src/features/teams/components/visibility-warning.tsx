import { Alert, AlertDescription } from "@/components/ui/alert";
import { EyeIcon } from "lucide-react";

interface VisibilityWarningProps {
  teamName?: string;
}

export function VisibilityWarning({ teamName }: VisibilityWarningProps) {
  if (teamName) {
    return (
      <Alert>
        <EyeIcon className="h-4 w-4" />
        <AlertDescription>
          This will be visible to <strong>{teamName}</strong> members only.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <EyeIcon className="h-4 w-4" />
      <AlertDescription>
        This will be visible to <strong>all members</strong> of your
        organization.
      </AlertDescription>
    </Alert>
  );
}
