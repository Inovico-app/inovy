import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { useTranslations } from "next-intl";

export function CertificationsSection() {
  const t = useTranslations("security.certifications");

  return (
    <section aria-labelledby="certifications-heading">
      <div className="mb-8">
        <h2
          id="certifications-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Award
                aria-hidden="true"
                className="size-5 text-indigo-600 dark:text-indigo-400"
              />
            </div>
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
