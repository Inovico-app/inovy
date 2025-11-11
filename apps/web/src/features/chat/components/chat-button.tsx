"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface ChatButtonProps {
  projectId: string;
  projectName: string;
}

/**
 * Renders a button that navigates to the chat interface with the specified project context.
 *
 * @param projectId - The ID of the project to include as context in the chat interface.
 * @returns A button component that navigates to the chat interface.
 */
export function ChatButton({ projectId }: ChatButtonProps) {
  const href: Route = `/chat?context=project&projectId=${projectId}`;

  return (
    <Button asChild className="gap-2" variant="default">
      <Link href={href}>
        <MessageSquare className="h-4 w-4" />
        Ask AI
      </Link>
    </Button>
  );
}
