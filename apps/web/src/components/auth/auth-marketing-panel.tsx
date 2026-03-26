import { Lock, Mic, Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function AuthMarketingPanel() {
  const t = await getTranslations("auth");

  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-primary px-12 py-12 text-primary-foreground">
      <div className="mx-auto w-full max-w-md">
        <h2 className="mb-4 text-3xl font-semibold">{t("marketingTitle")}</h2>
        <p className="mb-12 text-primary-foreground/90">
          {t("marketingSubtitle")}
        </p>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">
                {t("marketingFeature1Title")}
              </h3>
              <p className="text-sm text-primary-foreground/80">
                {t("marketingFeature1Description")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
              <Mic className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">
                {t("marketingFeature2Title")}
              </h3>
              <p className="text-sm text-primary-foreground/80">
                {t("marketingFeature2Description")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">
                {t("marketingFeature3Title")}
              </h3>
              <p className="text-sm text-primary-foreground/80">
                {t("marketingFeature3Description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
