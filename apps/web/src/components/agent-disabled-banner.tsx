import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangleIcon } from "lucide-react";

interface AgentDisabledBannerProps {
  organizationName?: string;
  className?: string;
}

export function AgentDisabledBanner({
  organizationName,
  className,
}: AgentDisabledBannerProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangleIcon className="h-4 w-4" />
      <AlertTitle>Agent Disabled</AlertTitle>
      <AlertDescription>
        {organizationName
          ? `The AI agent has been disabled for ${organizationName}.`
          : "The AI agent has been disabled for your organization."}{" "}
        Chat functionality and other agent features are currently unavailable.
        Please contact support if you have any questions.
      </AlertDescription>
    </Alert>
  );
}

