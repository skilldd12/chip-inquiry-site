// Type surface for lib/core.js (pure protocol helpers).

export const LOCALES: readonly string[];
export const DEFAULT_LOCALE: string;

export function cleanText(value: unknown, max?: number): string;
export function normalizeMpn(value: unknown): string;
export function normalizeBrand(value: unknown): string;
export function dedupeKey(brand: unknown, mpn: unknown): string;
export function isValidEmail(value: unknown): boolean;
export function isValidPhone(value: unknown): boolean;
export function parseQty(value: unknown): { ok: boolean; value: number | null };

export const MAX_ITEMS: number;
export const MAX_FILES: number;
export const MAX_FILE_BYTES: number;
export const ALLOWED_EXTENSIONS: string[];
export const ALLOWED_UPLOADS: Record<string, string[]>;

export function validateInquiry(
  input: Record<string, any>,
  options?: { hasAttachment?: boolean }
): {
  ok: boolean;
  errors: Record<string, string>;
  values: Record<string, any>;
};

export function formatInquiryCode(date: Date | string, randomHex: string): string;
export function csvCell(value: unknown, opts?: { guardFormula?: boolean }): string;
export function toCsv(
  headers: (string | number)[],
  rows: (string | number | null | undefined)[][],
  opts?: { guardFormula?: boolean }
): string;
export function safeExtension(filename: string): string;
export function sniffFileKind(buffer: Buffer | Uint8Array): string;
export function isAllowedUpload(
  filename: string,
  mimetype: string,
  buffer: Buffer
): { ok: boolean; reason?: string; kind?: string };
export function pickLocalized(row: any, base: string, locale: string): string;
export function hasTranslation(row: Record<string, unknown>, base: string, locale: string): boolean;
export function normalizeHeader(header: string): string;
export function guessMapping(headers: string[]): Record<string, string>;
export const IMPORT_FIELDS: { key: string; aliases: string[] }[];
export function validateImportRow(
  raw: Record<string, unknown>,
  rowNumber: number
): {
  rowNumber: number;
  ok: boolean;
  errors: string[];
  values: Record<string, string>;
  moq: number | null;
  key: string;
};
export function planImport(
  rows: any[],
  existingByKey: Record<string, any>,
  mode?: string
): any[];
export function importSummary(planned: any[]): Record<string, number>;
