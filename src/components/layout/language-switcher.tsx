"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { getLocalizedPathname, locales, type AppLocale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(nextLocale: string) {
    if (nextLocale === locale) {
      return;
    }

    const query = searchParams.toString();
    const localizedPathname = getLocalizedPathname(nextLocale, pathname);
    const nextHref = query ? `${localizedPathname}?${query}` : localizedPathname;

    window.location.replace(nextHref);
  }

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
      <span>{t("label")}</span>
      <select
        value={locale}
        onChange={(event) => handleChange(event.target.value)}
        className="app-select min-w-20 px-2 py-1 text-xs"
        aria-label={t("label")}
      >
        {locales.map((nextLocale) => (
          <option key={nextLocale} value={nextLocale}>
            {t(nextLocale)}
          </option>
        ))}
      </select>
    </label>
  );
}
