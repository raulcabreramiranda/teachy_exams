import {getRequestConfig} from "next-intl/server";
import {defaultLocale, isValidLocale} from "@/i18n/routing";

export default getRequestConfig(async ({locale, requestLocale}) => {
  const explicitLocale = locale ?? (await requestLocale);
  const resolvedLocale = isValidLocale(explicitLocale) ? explicitLocale : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
