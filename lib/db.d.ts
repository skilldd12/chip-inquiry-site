// Type surface for the plain-ESM persistence module (lib/db.js).
// Rows are intentionally loose: the schema is owned by SQLite, not TypeScript.

export type Db = {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
    get: (...params: unknown[]) => Record<string, unknown> | undefined;
    all: (...params: unknown[]) => Record<string, unknown>[];
  };
  exec: (sql: string) => void;
};

export type InquiryRow = {
  id: number;
  code: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  country: string;
  message: string;
  locale: string;
  kind: string;
  status: string;
  internal_note: string;
  notification_status: string;
  notification_detail: string;
  ip_hash: string;
  user_agent: string;
  dedupe_key: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
  attachment_count?: number;
};

export function getDb(): Db;
export function dbPath(): string;

export function getConfig(): Record<string, any>;
export function setConfig(patch: Record<string, unknown>, actor?: string): void;

export function listPublicBrands(): any[];
export function listAllBrands(): any[];
export function listCategories(): any[];
export function listServices(): any[];
export function listFaqs(): any[];
export function listAllFaqs(): any[];
export function listTeamRoles(): any[];
export function listWarehouseItems(): any[];
export function listSeo(): any[];
export function getSeo(pathname: string, locale: string): any | null;
export function localized(row: any, base: string, locale: string): string;

export const INQUIRY_STATUSES: string[];

export function createInquiry(
  values: Record<string, any>,
  meta?: Record<string, any>
): { id: number; code: string; createdAt: string };
export function findRecentDuplicate(
  dedupeKey: string,
  withinMinutes?: number
): { id: number; code: string; created_at: string } | null;
export function addAttachment(record: Record<string, any>): number;
export function setNotificationStatus(id: number, status: string, detail?: string): void;
export function listInquiries(opts?: {
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): { rows: InquiryRow[]; total: number };
export function getInquiry(
  id: number
): (InquiryRow & { items: any[]; attachments: any[] }) | null;
export function updateInquiry(
  id: number,
  patch: { status?: string; internalNote?: string },
  actor?: string
): boolean;
export function getAttachment(id: number): Record<string, any> | null;
export function countInquiriesByStatus(): {
  new: number;
  in_progress: number;
  replied: number;
  closed: number;
  total: number;
};

export function countParts(): number;
export function findPartsByKeys(keys: string[]): Record<string, any>;
export function applyImportRow(row: any, existingId: number | null, mode: string): string;
export function logImport(entry: Record<string, any>): void;
export function listImports(limit?: number): any[];
export function createImportBatch(record: Record<string, any>): number;
export function getImportBatch(token: string): Record<string, any> | null;
export function markImportBatchApplied(token: string): void;

export function findAdminByEmail(email: string): Record<string, any> | null;
export function createAdmin(input: Record<string, any>): number;
export function countAdmins(): number;
export function audit(actor: string, action: string, target?: string, detail?: string): void;
export function recentAudit(limit?: number): any[];
