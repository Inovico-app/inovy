"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProjectChatInterface } from "./project-chat-interface";

interface ChatButtonProps {
  projectId: string;
  projectName: string;
}

export function ChatButton({ projectId, projectName }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2"
        variant="default"
      >
        <MessageSquare className="h-4 w-4" />
        Ask AI
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl h-[600px] p-0 flex flex-col">
          <ProjectChatInterface projectId={projectId} projectName={projectName} />
        </DialogContent>
      </Dialog>
    </>
  );
}

