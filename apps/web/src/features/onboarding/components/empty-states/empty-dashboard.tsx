import { BarChart3, Mic } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyStateAction } from "./empty-state-layout";
import { EmptyStateLayout } from "./empty-state-layout";

interface EmptyDashboardProps {
  recordHref?: string;
}

export async function EmptyDashboard({
  recordHref,
}: EmptyDashboardProps): Promise<React.ReactNode> {
  const t = await getTranslations("onboarding");

  const features = [
    t("emptyDashboardFeature1"),
    t("emptyDashboardFeature2"),
    t("emptyDashboardFeature3"),
  ];

  return (
    <EmptyStateLayout
      icon={<BarChart3 className="h-7 w-7 text-primary" />}
      title={t("emptyDashboardTitle")}
      description={t("emptyDashboardDescription")}
      features={features}
    >
      <EmptyStateAction href={recordHref}>
        <Mic className="mr-2 h-4 w-4" />
        {t("emptyDashboardCta")}
      </EmptyStateAction>
    </EmptyStateLayout>
  );
}
