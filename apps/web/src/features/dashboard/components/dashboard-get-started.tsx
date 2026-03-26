import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function DashboardGetStarted() {
  const t = await getTranslations("dashboard");

  const steps = [
    {
      label: t("stepCreateProject"),
      action: (
        <Button
          size="sm"
          render={<Link href="/projects/create" />}
          nativeButton={false}
        >
          {t("createProject")}
        </Button>
      ),
    },
    {
      label: t("stepAddNotetaker"),
      action: (
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/meetings" />}
          nativeButton={false}
        >
          {t("viewMeetings")}
        </Button>
      ),
    },
    { label: t("stepReviewNotes") },
    { label: t("stepTrackTasks") },
  ];

  return (
    <Card className="mt-10">
      <CardHeader>
        <CardTitle>{t("getStarted")}</CardTitle>
        <CardDescription>{t("getStartedDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={`step-${i}`} className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className="text-sm">{step.label}</span>
              {step.action}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
