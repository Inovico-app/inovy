import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, FileAudio, Mic } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyStateLayout } from "./empty-state-layout";

interface EmptyRecordingsProps {
  recordHref?: string;
  connectCalendarHref?: string;
}

export async function EmptyRecordings({
  recordHref,
  connectCalendarHref,
}: EmptyRecordingsProps) {
  const t = await getTranslations("onboarding");

  const features = [
    t("emptyRecordingsFeature1"),
    t("emptyRecordingsFeature2"),
    t("emptyRecordingsFeature3"),
  ];

  return (
    <EmptyStateLayout
      icon={<FileAudio className="h-7 w-7 text-primary" />}
      title={t("emptyRecordingsTitle")}
      description={t("emptyRecordingsDescription")}
      features={features}
    >
      {recordHref ? (
        <a href={recordHref} className={buttonVariants({ variant: "default" })}>
          <Mic className="mr-2 h-4 w-4" />
          {t("emptyRecordingsCta")}
        </a>
      ) : (
        <Button>
          <Mic className="mr-2 h-4 w-4" />
          {t("emptyRecordingsCta")}
        </Button>
      )}
      {connectCalendarHref ? (
        <a
          href={connectCalendarHref}
          className={buttonVariants({ variant: "outline" })}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {t("emptyRecordingsConnectCalendar")}
        </a>
      ) : (
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          {t("emptyRecordingsConnectCalendar")}
        </Button>
      )}
    </EmptyStateLayout>
  );
}
