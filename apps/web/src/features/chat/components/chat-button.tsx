"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface ChatButtonProps {
  projectId: string;
  projectName: string;
}

export function ChatButton({ projectId, projectName }: ChatButtonProps) {
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

