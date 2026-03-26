"use client";

import { CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface MeetingsEmptyProps {
  variant: "no-meetings" | "no-results";
  onClearFilters?: () => void;
}

export function MeetingsEmpty({ variant, onClearFilters }: MeetingsEmptyProps) {
  const t = useTranslations("meetings");

  if (variant === "no-meetings") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("list.noMeetingsTitle")}
          </h3>
          <p className="text-muted-foreground">
            {t("list.noMeetingsDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {t("list.noResultsTitle")}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t("list.noResultsDescription")}
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            {t("filter.clearFilters")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
