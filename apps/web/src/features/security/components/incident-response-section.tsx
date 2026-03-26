import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function IncidentResponseSection() {
  const t = useTranslations("security.incidentResponse");

  return (
    <section aria-labelledby="incident-response-heading">
      <div className="mb-8">
        <h2
          id="incident-response-heading"
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
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <AlertTriangle
                aria-hidden="true"
                className="size-5 text-amber-600 dark:text-amber-400"
              />
            </div>
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
