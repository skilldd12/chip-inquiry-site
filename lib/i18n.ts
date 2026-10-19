import zh from "@/content/i18n/zh.json";
import en from "@/content/i18n/en.json";
import ru from "@/content/i18n/ru.json";

export const locales = ["zh", "en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export type Dictionary = typeof zh;

const dictionaries: Record<Locale, Dictionary> = {
  zh,
  en: en as Dictionary,
  ru: ru as Dictionary,
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

/** Tiny {placeholder} interpolation, used for counts and aria labels. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] === undefined ? `{${key}}` : String(vars[key])
  );
}

/** Absolute path inside a locale, e.g. /en/brands */
export function localePath(locale: Locale, path = ""): string {
  const clean = path.replace(/^\/+/, "");
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}

export function otherLocales(locale: Locale): Locale[] {
  return locales.filter((l) => l !== locale);
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4310").replace(
  /\/$/,
  ""
);

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const localeLabels: Record<Locale, string> = {
  zh: "中文",
  en: "EN",
  ru: "RU",
};

export const htmlLang: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
  ru: "ru",
};
