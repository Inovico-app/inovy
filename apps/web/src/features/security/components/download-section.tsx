import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function DownloadSection() {
  const t = useTranslations("security.download");

  return (
    <section aria-labelledby="download-heading">
      <div className="mb-8">
        <h2
          id="download-heading"
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
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 ring-1 ring-teal-500/20">
              <FileText
                aria-hidden="true"
                className="size-5 text-teal-600 dark:text-teal-400"
              />
            </div>
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
