"use client";

import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

interface AddBotSectionProps {
  onAddBot: () => void;
  isAddingBot: boolean;
}

export function AddBotSection({ onAddBot, isAddingBot }: AddBotSectionProps) {
  const t = useTranslations("meetings");

  return (
    <section aria-labelledby="add-notetaker-heading">
      <h3 id="add-notetaker-heading" className="font-semibold mb-3">
        {t("bot.addNotetakerAssistant")}
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        {t("bot.addNotetakerAssistantDescription")}
      </p>
      <Button onClick={onAddBot} disabled={isAddingBot}>
        {isAddingBot ? (
          <>
            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            {t("bot.adding")}
          </>
        ) : (
          t("bot.addNotetakerAssistant")
        )}
      </Button>
    </section>
  );
}
