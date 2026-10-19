import { z } from "zod";

/** Shared by browser forms and server readers; deliberately has no database imports. */
export const EDITORIAL_LOCALES = ["zh", "en", "ru"] as const;
export const EDITORIAL_MEDIA_KEYS = [
  "warehouse", "dry-storage", "receiving", "packing", "inspection", "traceability", "team", "bom",
  "category-processors", "category-memory", "category-power", "category-analog", "category-connectors", "category-passives",
  "industry-industrial", "industry-network", "industry-energy", "industry-automotive",
] as const;

export function isEditorialAssetPath(value: string): boolean {
  return /^\/(?:images|uploads)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g|avif|gif)$/i.test(value);
}

const keySchema = z.string().max(100).regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/);
const localizedSchema = (max: number) => z.object({
  zh: z.string().trim().max(max),
  en: z.string().trim().max(max),
  ru: z.string().trim().max(max),
}).strict();

export const editorialMediaSchema = z.object({
  src: z.string().max(300).refine(isEditorialAssetPath, "图片必须使用 /images/ 或 /uploads/ 下的本地图片路径"),
  alt: localizedSchema(300),
  caption: localizedSchema(800),
  source: z.string().trim().max(500),
  kind: z.enum(["illustrative", "photo"]),
  position: z.string().regex(/^(?:100|\d{1,2})(?:\.\d+)?% (?:100|\d{1,2})(?:\.\d+)?%$/)
    .refine((value) => value.split(" ").every((part) => parseFloat(part) <= 100), "焦点必须为 0% 至 100%"),
}).strict();

export const editorialPageSchema = z.object({
  title: localizedSchema(200),
  lead: localizedSchema(2000),
  imageKey: z.union([z.literal(""), keySchema]),
  relatedBrands: z.array(keySchema).max(40),
  relatedCategories: z.array(keySchema).max(30),
}).strict();

const editorialConfigSchema = z.object({
  media: z.record(keySchema, editorialMediaSchema).refine((value) => Object.keys(value).length <= 100),
  pages: z.record(keySchema, editorialPageSchema).refine((value) => Object.keys(value).length <= 150),
}).strict();

export type EditorialMedia = z.infer<typeof editorialMediaSchema>;
export type EditorialPage = z.infer<typeof editorialPageSchema>;
export type EditorialConfig = z.infer<typeof editorialConfigSchema>;
export type EditorialLocalized = EditorialMedia["alt"];

/** Reject invalid submitted edits atomically, so a bad asset never replaces a working page. */
export function validateEditorialConfig(input: unknown):
  { ok: true; value: EditorialConfig } | { ok: false; error: string } {
  const result = editorialConfigSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const issue = result.error.issues[0];
  return { ok: false, error: `${issue.path.join(".")}: ${issue.message}` };
}

/** Stored data may predate this schema. Ignore only invalid records and retain valid overrides. */
export function parseEditorialConfig(input: unknown): EditorialConfig {
  const output: EditorialConfig = { media: {}, pages: {} };
  if (!input || typeof input !== "object" || Array.isArray(input)) return output;
  const record = input as Record<string, unknown>;
  for (const scope of ["media", "pages"] as const) {
    const entries = record[scope];
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
    for (const [key, value] of Object.entries(entries).slice(0, scope === "media" ? 100 : 150)) {
      if (!keySchema.safeParse(key).success) continue;
      if (scope === "media") {
        const parsed = editorialMediaSchema.safeParse(value);
        if (parsed.success) output.media[key] = parsed.data;
      } else {
        const parsed = editorialPageSchema.safeParse(value);
        if (parsed.success) output.pages[key] = parsed.data;
      }
    }
  }
  return output;
}
