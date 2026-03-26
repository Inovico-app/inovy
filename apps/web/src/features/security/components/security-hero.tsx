import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export function SecurityHero() {
  const t = useTranslations("security.hero");

  return (
    <section className="relative overflow-hidden pb-16 pt-24 sm:pb-24 sm:pt-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-6 text-center sm:px-8">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-foreground/5">
          <ShieldCheck
            aria-hidden="true"
            className="size-4 text-emerald-600 dark:text-emerald-400"
          />
          <span>{t("subtitle")}</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {t("title")}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {t("description")}
        </p>
      </div>
    </section>
  );
}
