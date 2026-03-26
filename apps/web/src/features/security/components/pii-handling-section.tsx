import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

export function PiiHandlingSection() {
  const t = useTranslations("security.piiHandling");

  return (
    <section aria-labelledby="pii-handling-heading">
      <div className="mb-8">
        <h2
          id="pii-handling-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/20">
                <Eye
                  aria-hidden="true"
                  className="size-5 text-cyan-600 dark:text-cyan-400"
                />
              </div>
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
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 ring-1 ring-rose-500/20">
                <EyeOff
                  aria-hidden="true"
                  className="size-5 text-rose-600 dark:text-rose-400"
                />
              </div>
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
