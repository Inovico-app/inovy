"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/i18n/locale";
import type { Locale } from "@/i18n/config";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALE_LABELS: Record<Locale, string> = {
  nl: "Nederlands",
  en: "English",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  async function handleChange(value: string | null) {
    if (!value) return;
    await setLocale(value);
    router.refresh();
  }

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]" aria-label="Select language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
