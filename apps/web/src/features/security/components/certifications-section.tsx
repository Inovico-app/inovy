import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconBadge } from "@/features/security/components/icon-badge";
import { SectionHeading } from "@/features/security/components/section-heading";
import { Award } from "lucide-react";
import { useTranslations } from "next-intl";

export function CertificationsSection() {
  const t = useTranslations("security.certifications");

  return (
    <section aria-labelledby="certifications-heading">
      <SectionHeading
        id="certifications-heading"
        title={t("title")}
        description={t("description")}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconBadge
              icon={Award}
              className="text-indigo-600 dark:text-indigo-400"
              containerClassName="bg-indigo-500/10 ring-indigo-500/20"
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CardTitle>{t("soc2.title")}</CardTitle>
                <Badge variant="outline">{t("soc2.status")}</Badge>
              </div>
              <CardDescription>{t("soc2.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
            <div className="relative size-3">
              <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-block size-3 rounded-full bg-indigo-500" />
            </div>
            <span className="text-sm font-medium text-foreground">Q4 2026</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
