import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconBadge } from "@/features/security/components/icon-badge";
import { SectionHeading } from "@/features/security/components/section-heading";
import { Database, Globe, HardDrive, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const DATA_RESIDENCY_ITEMS: ReadonlyArray<{ key: string; icon: LucideIcon }> = [
  { key: "database", icon: Database },
  { key: "vectorSearch", icon: Globe },
  { key: "storage", icon: HardDrive },
  { key: "meetingBot", icon: Video },
];

export function DataResidencySection() {
  const t = useTranslations("security.dataResidency");

  return (
    <section aria-labelledby="data-residency-heading">
      <SectionHeading
        id="data-residency-heading"
        title={t("title")}
        description={t("description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {DATA_RESIDENCY_ITEMS.map(({ key, icon }) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <IconBadge icon={icon} />
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
        ))}
      </div>
    </section>
  );
}
