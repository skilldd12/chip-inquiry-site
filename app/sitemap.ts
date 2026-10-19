import type { MetadataRoute } from "next";
import { SITE_URL, locales } from "@/lib/i18n";
import { articles, brandStories, editorialCategories, industries, serviceStories } from "@/lib/editorial";

const PATHS = [
  "",
  "brands",
  "capabilities",
  "warehouse-quality",
  "about",
  "contact",
  "inquiry",
  "faq",
  "privacy",
  "terms",
  "products",
  "quality",
  "industries",
  "resources",
  ...editorialCategories.map(item => `products/${item.slug}`),
  ...brandStories.map(item => `brands/${item.slug}`),
  ...serviceStories.map(item => `capabilities/${item.slug}`),
  ...industries.map(item => `industries/${item.slug}`),
  ...articles.map(item => `resources/${item.slug}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const path of PATHS) {
      const suffix = path ? `/${path}` : "";
      entries.push({
        url: `${SITE_URL}/${locale}${suffix}`,
        lastModified: new Date(),
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : path === "inquiry" ? 0.9 : 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l === "zh" ? "zh-CN" : l, `${SITE_URL}/${l}${suffix}`])
          ),
        },
      });
    }
  }
  return entries;
}
