"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/i18n/locale";
import type { Locale } from "@/i18n/config";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCALE_CONFIG: Record<Locale, { flag: string; label: string }> = {
  nl: { flag: "🇳🇱", label: "Nederlands" },
  en: { flag: "🇬🇧", label: "English" },
};

export function LocaleSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();

  async function handleSelect(locale: Locale) {
    if (locale === currentLocale) return;
    await setLocale(locale);
    router.refresh();
  }

  return (
    <div className="flex flex-col w-full">
      {SUPPORTED_LOCALES.map((locale) => {
        const { flag, label } = LOCALE_CONFIG[locale];
        const isActive = locale === currentLocale;

        return (
          <button
            key={locale}
            type="button"
            onClick={() => handleSelect(locale)}
            className={cn(
              "flex items-center gap-3 w-full rounded-sm px-2 py-1.5 text-sm transition-colors",
              isActive
                ? "font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <span className="text-base leading-none">{flag}</span>
            <span className="flex-1 text-left">{label}</span>
            {isActive && <CheckIcon className="h-4 w-4 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
