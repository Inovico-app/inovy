import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardCheck, Clock, EyeOff, ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";

const AVG_ITEMS = [
  {
    key: "consent",
    Icon: ClipboardCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
  },
  {
    key: "piiRedaction",
    Icon: EyeOff,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/20",
  },
  {
    key: "auditLogging",
    Icon: ScrollText,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/20",
  },
  {
    key: "dataRetention",
    Icon: Clock,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    ring: "ring-orange-500/20",
  },
] as const;

export function AvgComplianceSection() {
  const t = useTranslations("security.avgCompliance");

  return (
    <section aria-labelledby="avg-compliance-heading">
      <div className="mb-8">
        <h2
          id="avg-compliance-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {AVG_ITEMS.map(({ key, Icon, color, bg, ring }) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${bg} ring-1 ${ring}`}
                >
                  <Icon aria-hidden="true" className={`size-5 ${color}`} />
                </div>
                <CardTitle>{t(`items.${key}.title`)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{t(`items.${key}.description`)}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
