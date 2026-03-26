import { Calendar, FileAudio, Mic } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyStateAction } from "./empty-state-layout";
import { EmptyStateLayout } from "./empty-state-layout";

interface EmptyRecordingsProps {
  recordHref?: string;
  connectCalendarHref?: string;
}

export async function EmptyRecordings({
  recordHref,
  connectCalendarHref,
}: EmptyRecordingsProps): Promise<React.ReactNode> {
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
      <EmptyStateAction href={recordHref}>
        <Mic className="mr-2 h-4 w-4" />
        {t("emptyRecordingsCta")}
      </EmptyStateAction>
      <EmptyStateAction href={connectCalendarHref} variant="outline">
        <Calendar className="mr-2 h-4 w-4" />
        {t("emptyRecordingsConnectCalendar")}
      </EmptyStateAction>
    </EmptyStateLayout>
  );
}
