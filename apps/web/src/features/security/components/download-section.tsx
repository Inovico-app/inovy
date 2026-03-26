import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconBadge } from "@/features/security/components/icon-badge";
import { SectionHeading } from "@/features/security/components/section-heading";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function DownloadSection() {
  const t = useTranslations("security.download");

  return (
    <section aria-labelledby="download-heading">
      <SectionHeading
        id="download-heading"
        title={t("title")}
        description={t("description")}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconBadge
              icon={FileText}
              className="text-teal-600 dark:text-teal-400"
              containerClassName="bg-teal-500/10 ring-teal-500/20"
            />
            <div>
              <CardTitle>{t("dpaButton")}</CardTitle>
              <CardDescription>{t("dpaDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/admin/compliance/dpa"
            className={buttonVariants({ size: "lg" })}
          >
            <FileText aria-hidden="true" className="size-4" />
            {t("dpaButton")}
          </Link>
          <p className="text-xs text-muted-foreground">{t("loginRequired")}</p>
        </CardContent>
      </Card>
    </section>
  );
}
