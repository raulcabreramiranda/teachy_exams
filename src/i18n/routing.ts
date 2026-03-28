import {defineRouting} from "next-intl/routing";

export const locales = ["en", "pt", "es"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export function isValidLocale(value: string | undefined | null): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function getLocalizedPathname(
  locale: string | undefined | null,
  pathname: string,
) {
  const activeLocale = isValidLocale(locale) ? locale : defaultLocale;
  const normalizedPathname =
    pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`;

  return `/${activeLocale}${normalizedPathname}`;
}
