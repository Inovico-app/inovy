"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PermissionExplanationDialog } from "@/features/integrations/google/components/permission-explanation-dialog";
import { MsIncrementalPermissionDialog } from "@/features/integrations/microsoft/components/incremental-permission-dialog";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export function CalendarConnectionPrompt() {
  const t = useTranslations("meetings");
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const [showMicrosoftDialog, setShowMicrosoftDialog] = useState(false);

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {t("calendarConnection.title")}
          </CardTitle>
          <CardDescription className="text-base">
            {t("calendarConnection.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t("calendarConnection.onceConnected")}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>{t("calendarConnection.benefit1")}</li>
              <li>{t("calendarConnection.benefit2")}</li>
              <li>{t("calendarConnection.benefit3")}</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              className="flex-1"
              onClick={() => setShowGoogleDialog(true)}
            >
              {t("calendarConnection.connectGoogle")}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setShowMicrosoftDialog(true)}
            >
              {t("calendarConnection.connectMicrosoft")}
            </Button>
          </div>
          <div className="flex justify-center pt-2">
            <Button
              variant="link"
              render={<Link href="/settings/integrations" />}
              nativeButton={false}
            >
              {t("calendarConnection.manageIntegrations")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PermissionExplanationDialog
        open={showGoogleDialog}
        onOpenChange={setShowGoogleDialog}
        tiers={["base"]}
        redirectUrl="/meetings"
      />

      <MsIncrementalPermissionDialog
        open={showMicrosoftDialog}
        onOpenChange={setShowMicrosoftDialog}
        tier="base"
        returnUrl="/meetings"
      />
    </div>
  );
}
