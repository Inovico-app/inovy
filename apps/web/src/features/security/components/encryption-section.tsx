import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconBadge } from "@/features/security/components/icon-badge";
import { SectionHeading } from "@/features/security/components/section-heading";
import { Lock, Shield } from "lucide-react";
import { useTranslations } from "next-intl";

export function EncryptionSection() {
  const t = useTranslations("security.encryption");

  return (
    <section aria-labelledby="encryption-heading">
      <SectionHeading
        id="encryption-heading"
        title={t("title")}
        description={t("description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <IconBadge
                icon={Lock}
                className="text-amber-600 dark:text-amber-400"
                containerClassName="bg-amber-500/10 ring-amber-500/20"
              />
              <div>
                <CardTitle>{t("atRest.title")}</CardTitle>
                <CardDescription>AES-256</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("atRest.description")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <IconBadge
                icon={Shield}
                className="text-sky-600 dark:text-sky-400"
                containerClassName="bg-sky-500/10 ring-sky-500/20"
              />
              <div>
                <CardTitle>{t("inTransit.title")}</CardTitle>
                <CardDescription>TLS 1.3</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("inTransit.description")}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
