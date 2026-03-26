"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getAutoProcessPreferenceClient } from "@/features/recordings/lib/recording-preferences";
import { setAutoProcessPreference } from "@/features/recordings/lib/recording-preferences-server";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function AutoProcessToggle() {
  const t = useTranslations("recordings");
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preference on mount
  useEffect(() => {
    try {
      const preference = getAutoProcessPreferenceClient();
      setIsEnabled(preference);
    } catch (error) {
      console.error("Failed to load auto-process preference:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggle = async () => {
    const newValue = !isEnabled;
    setIsSaving(true);

    try {
      await setAutoProcessPreference(newValue);
      setIsEnabled(newValue);

      toast.success(
        newValue
          ? t("autoProcess.enabledToast")
          : t("autoProcess.disabledToast"),
        {
          description: newValue
            ? t("autoProcess.enabledDescription")
            : t("autoProcess.disabledDescription"),
        },
      );
    } catch (error) {
      console.error("Failed to update auto-process preference:", error);
      toast.error(t("autoProcess.saveFailed"), {
        description: t("autoProcess.saveFailedDescription"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("autoProcess.title")}</CardTitle>
          <CardDescription>{t("autoProcess.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("autoProcess.title")}</CardTitle>
        <CardDescription>{t("autoProcess.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="auto-process" className="text-base font-medium">
              Auto-verwerking
            </Label>
            <p className="text-sm text-muted-foreground">
              Start automatisch AI verwerking (transcriptie, samenvatting,
              taken) na het opslaan van een live opname
            </p>
          </div>
          <Button
            id="auto-process"
            variant={isEnabled ? "default" : "outline"}
            onClick={handleToggle}
            disabled={isSaving}
            className="min-w-[100px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : isEnabled ? (
              t("autoProcess.enabled")
            ) : (
              t("autoProcess.disabled")
            )}
          </Button>
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium mb-2">{t("autoProcess.noteTitle")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              Deze instelling is alleen van toepassing op{" "}
              <strong>live opnames</strong>
            </li>
            <li>Geüploade bestanden worden altijd automatisch verwerkt</li>
            <li>
              Je kunt verwerking altijd handmatig starten als auto-verwerking is
              uitgeschakeld
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
