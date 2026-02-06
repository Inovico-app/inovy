"use client";

import { Button } from "@/components/ui/button";
import type { BotSession, BotStatus } from "@/server/db/schema/bot-sessions";
import { BotSessionCard } from "./bot-session-card";

interface BotSessionsListProps {
  initialSessions: BotSession[];
  status?: BotStatus | BotStatus[];
  hasMore?: boolean;
  onActionComplete?: () => void;
}

function getEmptyMessage(status?: BotStatus | BotStatus[]): string {
  if (!status) return "No active sessions";
  const statusArray = Array.isArray(status) ? status : [status];
  if (statusArray.includes("failed")) return "No failed sessions";
  if (statusArray.includes("completed")) return "No completed sessions";
  return "No active sessions";
}

export function BotSessionsList({
  initialSessions,
  status,
  hasMore = false,
  onActionComplete,
}: BotSessionsListProps) {
  if (initialSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{getEmptyMessage(status)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {initialSessions.map((session) => (
        <BotSessionCard
          key={session.id}
          session={session}
          onActionComplete={onActionComplete}
        />
      ))}
      {hasMore && (
        <div className="text-center pt-4">
          <Button variant="outline" disabled>
            Load More (Coming Soon)
          </Button>
        </div>
      )}
    </div>
  );
}

