import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconBadge } from "@/features/security/components/icon-badge";
import { SectionHeading } from "@/features/security/components/section-heading";
import { ClipboardCheck, Clock, EyeOff, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const AVG_ITEMS: ReadonlyArray<{
  key: string;
  icon: LucideIcon;
  iconClassName: string;
  containerClassName: string;
}> = [
  {
    key: "consent",
    icon: ClipboardCheck,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    containerClassName: "bg-emerald-500/10 ring-emerald-500/20",
  },
  {
    key: "piiRedaction",
    icon: EyeOff,
    iconClassName: "text-rose-600 dark:text-rose-400",
    containerClassName: "bg-rose-500/10 ring-rose-500/20",
  },
  {
    key: "auditLogging",
    icon: ScrollText,
    iconClassName: "text-violet-600 dark:text-violet-400",
    containerClassName: "bg-violet-500/10 ring-violet-500/20",
  },
  {
    key: "dataRetention",
    icon: Clock,
    iconClassName: "text-orange-600 dark:text-orange-400",
    containerClassName: "bg-orange-500/10 ring-orange-500/20",
  },
];

export function AvgComplianceSection() {
  const t = useTranslations("security.avgCompliance");

  return (
    <section aria-labelledby="avg-compliance-heading">
      <SectionHeading
        id="avg-compliance-heading"
        title={t("title")}
        description={t("description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {AVG_ITEMS.map(({ key, icon, iconClassName, containerClassName }) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <IconBadge
                  icon={icon}
                  className={iconClassName}
                  containerClassName={containerClassName}
                />
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
