import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Shield } from "lucide-react";
import { useTranslations } from "next-intl";

export function EncryptionSection() {
  const t = useTranslations("security.encryption");

  return (
    <section aria-labelledby="encryption-heading">
      <div className="mb-8">
        <h2
          id="encryption-heading"
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
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                <Lock
                  aria-hidden="true"
                  className="size-5 text-amber-600 dark:text-amber-400"
                />
              </div>
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
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/20">
                <Shield
                  aria-hidden="true"
                  className="size-5 text-sky-600 dark:text-sky-400"
                />
              </div>
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
