import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Database, Globe, HardDrive, Video } from "lucide-react";
import { useTranslations } from "next-intl";

const DATA_RESIDENCY_ICONS = {
  database: Database,
  vectorSearch: Globe,
  storage: HardDrive,
  meetingBot: Video,
} as const;

const DATA_RESIDENCY_KEYS = [
  "database",
  "vectorSearch",
  "storage",
  "meetingBot",
] as const;

export function DataResidencySection() {
  const t = useTranslations("security.dataResidency");

  return (
    <section aria-labelledby="data-residency-heading">
      <div className="mb-8">
        <h2
          id="data-residency-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DATA_RESIDENCY_KEYS.map((key) => {
          const Icon = DATA_RESIDENCY_ICONS[key];

          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 ring-1 ring-primary/10">
                    <Icon aria-hidden="true" className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t(`items.${key}.label`)}</CardTitle>
                    <CardDescription>
                      {t(`items.${key}.provider`)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-foreground">
                    {t(`items.${key}.location`)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
