import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconBadge } from "@/features/security/components/icon-badge";
import { SectionHeading } from "@/features/security/components/section-heading";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

export function PiiHandlingSection() {
  const t = useTranslations("security.piiHandling");

  return (
    <section aria-labelledby="pii-handling-heading">
      <SectionHeading
        id="pii-handling-heading"
        title={t("title")}
        description={t("description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <IconBadge
                icon={Eye}
                className="text-cyan-600 dark:text-cyan-400"
                containerClassName="bg-cyan-500/10 ring-cyan-500/20"
              />
              <CardTitle>{t("detection.title")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{t("detection.description")}</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <IconBadge
                icon={EyeOff}
                className="text-rose-600 dark:text-rose-400"
                containerClassName="bg-rose-500/10 ring-rose-500/20"
              />
              <CardTitle>{t("redaction.title")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>{t("redaction.description")}</CardDescription>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
