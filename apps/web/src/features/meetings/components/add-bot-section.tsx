"use client";

import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

interface AddBotSectionProps {
  onAddBot: () => void;
  isAddingBot: boolean;
}

export function AddBotSection({ onAddBot, isAddingBot }: AddBotSectionProps) {
  return (
    <section aria-labelledby="add-bot-heading">
      <h3 id="add-bot-heading" className="font-semibold mb-3">
        Add Bot
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Add a recording bot to join this meeting when it starts.
      </p>
      <Button onClick={onAddBot} disabled={isAddingBot}>
        {isAddingBot ? (
          <>
            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          "Add Bot to Meeting"
        )}
      </Button>
    </section>
  );
}
