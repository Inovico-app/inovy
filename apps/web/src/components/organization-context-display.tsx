"use client";

import { Badge } from "./ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

interface OrganizationContextDisplayProps {
  organizationId: string;
  organizationName?: string;
  compact?: boolean;
}

/**
 * Component to display organization context information
 * Useful for debugging and admin interfaces
 */
export function OrganizationContextDisplay({
  organizationId,
  organizationName,
  compact = false,
}: OrganizationContextDisplayProps) {
  if (compact) {
    return (
      <HoverCard>
        <HoverCardTrigger>
          <Badge variant="outline" className="text-xs">
            {organizationName ?? organizationId}
          </Badge>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Organization Context</h4>
            <div className="text-sm">
              <p className="text-muted-foreground">Organization ID:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {organizationId}
              </code>
            </div>
            {organizationName && (
              <div className="text-sm">
                <p className="text-muted-foreground">Name:</p>
                <p>{organizationName}</p>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold">Organization Context</h3>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ID:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {organizationId}
          </code>
        </div>
        {organizationName && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Name:</span>
            <span className="text-sm">{organizationName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

