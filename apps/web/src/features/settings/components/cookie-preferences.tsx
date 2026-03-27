"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCookiePreferences } from "@/features/settings/hooks/use-cookie-preferences";
import { Cookie } from "lucide-react";
import { useTranslations } from "next-intl";

export function CookiePreferences() {
  const t = useTranslations("settings.profile.cookies");
  const { hasConsented, handleResetConsent } = useCookiePreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Cookie className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("info")}</p>
        {hasConsented && (
          <Button variant="outline" size="sm" onClick={handleResetConsent}>
            {t("resetConsent")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
