"use client";

import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

interface AddBotSectionProps {
  onAddBot: () => void;
  isAddingBot: boolean;
}

export function AddBotSection({ onAddBot, isAddingBot }: AddBotSectionProps) {
  return (
    <section aria-labelledby="add-notetaker-heading">
      <h3 id="add-notetaker-heading" className="font-semibold mb-3">
        Add Notetaker Assistant
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Add a notetaker assistant to join this meeting when it starts.
      </p>
      <Button onClick={onAddBot} disabled={isAddingBot}>
        {isAddingBot ? (
          <>
            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          "Add Notetaker Assistant"
        )}
      </Button>
    </section>
  );
}
