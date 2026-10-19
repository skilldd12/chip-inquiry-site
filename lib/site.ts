import { cache } from "react";
import {
  getConfig,
  getSeo,
  listCategories,
  listFaqs,
  listPublicBrands,
  listServices,
  listTeamRoles,
  listWarehouseItems,
} from "./db.js";
import { getDictionary, type Locale } from "./i18n";

export type Brand = {
  slug: string;
  name: string;
  legal_name: string;
  logo_key: string;
  brand_color: string;
  website: string;
  categories: string;
};

export type Category = {
  slug: string;
  name_zh: string;
  name_en: string;
  name_ru: string;
  blurb_zh: string;
  blurb_en: string;
  blurb_ru: string;
};

export type Service = {
  slug: string;
  title_zh: string;
  title_en: string;
  title_ru: string;
  body_zh: string;
  body_en: string;
  body_ru: string;
  note_zh: string;
  note_en: string;
  note_ru: string;
};

export type Faq = {
  id: number;
  question_zh: string;
  question_en: string;
  question_ru: string;
  answer_zh: string;
  answer_en: string;
  answer_ru: string;
};

export type Role = {
  id: number;
  title_zh: string;
  title_en: string;
  title_ru: string;
  body_zh: string;
  body_en: string;
  body_ru: string;
  headcount: string;
  is_verified: number;
};

export type WarehouseItem = {
  id: number;
  title_zh: string;
  title_en: string;
  title_ru: string;
  body_zh: string;
  body_en: string;
  body_ru: string;
  is_verified: number;
};

export type Company = {
  name_zh: string;
  name_en: string;
  legal_name: string;
  short_zh: string;
  short_en: string;
  founded: string;
  email: string;
  phone: string;
  whatsapp: string;
  wechat: string;
  address_zh: string;
  address_en: string;
  address_ru: string;
  hours_zh: string;
  hours_en: string;
  hours_ru: string;
  pending_note: boolean;
};

export type SiteConfig = {
  company: Company;
  hero: { image_01: string; image_02: string; image_03: string; image_note: string };
  media: { warehouse: string; warehouse_note: string };
  notification: { sales_email: string; webhook_url: string; enabled: boolean };
  legal: { updated: string; jurisdiction_zh: string; jurisdiction_en: string };
};

const FALLBACK: SiteConfig = {
  company: {
    name_zh: "轴点电子",
    name_en: "AXIOM COMPONENTS",
    legal_name: "",
    short_zh: "轴点",
    short_en: "AXIOM",
    founded: "",
    email: "",
    phone: "",
    whatsapp: "",
    wechat: "",
    address_zh: "",
    address_en: "",
    address_ru: "",
    hours_zh: "周一至周五 09:00–18:00（GMT+8）",
    hours_en: "Mon–Fri, 09:00–18:00 (GMT+8)",
    hours_ru: "Пн–Пт, 09:00–18:00 (GMT+8)",
    pending_note: true,
  },
  hero: {
    image_01: "/images/hero-state-01.jpg",
    image_02: "/images/hero-state-02.jpg",
    image_03: "/images/hero-state-03.jpg",
    image_note: "prototype-render",
  },
  media: { warehouse: "/images/warehouse-01.jpg", warehouse_note: "illustrative" },
  notification: { sales_email: "", webhook_url: "", enabled: false },
  legal: { updated: "2026-10-19", jurisdiction_zh: "待确认", jurisdiction_en: "To be confirmed" },
};

export const getSiteData = cache(() => {
  const config = getConfig() as Partial<SiteConfig>;
  return {
    config: {
      ...FALLBACK,
      ...config,
      company: { ...FALLBACK.company, ...(config.company || {}) },
      hero: { ...FALLBACK.hero, ...(config.hero || {}) },
      media: { ...FALLBACK.media, ...(config.media || {}) },
      notification: { ...FALLBACK.notification, ...(config.notification || {}) },
      legal: { ...FALLBACK.legal, ...(config.legal || {}) },
    } as SiteConfig,
    brands: listPublicBrands() as Brand[],
    categories: listCategories() as Category[],
    services: listServices() as Service[],
    faqs: listFaqs() as Faq[],
    teamRoles: listTeamRoles() as Role[],
    warehouseItems: listWarehouseItems() as WarehouseItem[],
  };
});

export function localizedField<T extends Record<string, unknown>>(
  row: T,
  base: string,
  locale: Locale
): string {
  const dict = getDictionary(locale);
  const order: Locale[] = [locale, "en", "zh", "ru"];
  for (const l of order) {
    const value = row[`${base}_${l}`];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function metaFor(pathname: string, locale: Locale, fallback: { title: string; description: string }) {
  const seo = getSeo(pathname, locale) as { title?: string; description?: string } | null;
  return {
    title: seo?.title || fallback.title,
    description: seo?.description || fallback.description,
  };
}

export function companyName(config: SiteConfig, locale: Locale) {
  return locale === "zh" ? config.company.name_zh : config.company.name_en;
}

export function hasContact(company: Company) {
  return Boolean(company.email || company.phone || company.whatsapp);
}

export function splitCategories(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
