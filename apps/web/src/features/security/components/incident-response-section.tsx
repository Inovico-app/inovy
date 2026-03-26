import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconBadge } from "@/features/security/components/icon-badge";
import { SectionHeading } from "@/features/security/components/section-heading";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function IncidentResponseSection() {
  const t = useTranslations("security.incidentResponse");

  return (
    <section aria-labelledby="incident-response-heading">
      <SectionHeading
        id="incident-response-heading"
        title={t("title")}
        description={t("description")}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconBadge
              icon={AlertTriangle}
              className="text-amber-600 dark:text-amber-400"
              containerClassName="bg-amber-500/10 ring-amber-500/20"
            />
            <CardTitle>{t("commitment")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("commitmentDescription")}
          </p>
          <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {t("contactLabel")}:{" "}
            </span>
            <Link
              href={`mailto:${t("contactEmail")}`}
              className="text-sm font-medium text-primary underline underline-offset-2"
            >
              {t("contactEmail")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
