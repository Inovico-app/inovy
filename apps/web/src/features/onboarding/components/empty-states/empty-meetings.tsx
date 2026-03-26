import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyStateLayout } from "./empty-state-layout";

interface EmptyMeetingsProps {
  connectCalendarHref?: string;
}

export async function EmptyMeetings({
  connectCalendarHref,
}: EmptyMeetingsProps) {
  const t = await getTranslations("onboarding");

  const features = [
    t("emptyMeetingsFeature1"),
    t("emptyMeetingsFeature2"),
    t("emptyMeetingsFeature3"),
  ];

  return (
    <EmptyStateLayout
      icon={<CalendarDays className="h-7 w-7 text-primary" />}
      title={t("emptyMeetingsTitle")}
      description={t("emptyMeetingsDescription")}
      features={features}
    >
      {connectCalendarHref ? (
        <a
          href={connectCalendarHref}
          className={buttonVariants({ variant: "default" })}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {t("emptyMeetingsCta")}
        </a>
      ) : (
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          {t("emptyMeetingsCta")}
        </Button>
      )}
    </EmptyStateLayout>
  );
}
