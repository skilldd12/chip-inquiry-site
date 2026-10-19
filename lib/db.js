/**
 * SQLite persistence (built-in `node:sqlite`, no native build step).
 *
 * The whole content layer lives here: site configuration, catalogue content,
 * inquiry records, attachments metadata, admin users and the import log.
 * Public projections never include internal supply relations, notes or PII.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { formatInquiryCode, normalizeMpn, pickLocalized } from "./core.js";

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "data");
const DB_FILE = process.env.DATABASE_FILE
  ? path.resolve(process.env.DATABASE_FILE)
  : path.join(DATA_DIR, "app.db");

const SCHEMA_VERSION = 4;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readSeed() {
  const seedPath = path.resolve(process.cwd(), "content/seed.json");
  return JSON.parse(fs.readFileSync(seedPath, "utf8"));
}

function migrate(db) {
  const current = Number(db.prepare("PRAGMA user_version").get().user_version || 0);
  if (current >= SCHEMA_VERSION) return;

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'editor',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      legal_name TEXT NOT NULL DEFAULT '',
      logo_key TEXT NOT NULL DEFAULT '',
      brand_color TEXT NOT NULL DEFAULT '#17191C',
      website TEXT NOT NULL DEFAULT '',
      categories TEXT NOT NULL DEFAULT '',
      supply_relation TEXT NOT NULL DEFAULT 'to_be_confirmed',
      supply_note TEXT NOT NULL DEFAULT '',
      internal_note TEXT NOT NULL DEFAULT '',
      is_public INTEGER NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name_zh TEXT NOT NULL DEFAULT '',
      name_en TEXT NOT NULL DEFAULT '',
      name_ru TEXT NOT NULL DEFAULT '',
      blurb_zh TEXT NOT NULL DEFAULT '',
      blurb_en TEXT NOT NULL DEFAULT '',
      blurb_ru TEXT NOT NULL DEFAULT '',
      sort INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title_zh TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL DEFAULT '',
      title_ru TEXT NOT NULL DEFAULT '',
      body_zh TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_ru TEXT NOT NULL DEFAULT '',
      note_zh TEXT NOT NULL DEFAULT '',
      note_en TEXT NOT NULL DEFAULT '',
      note_ru TEXT NOT NULL DEFAULT '',
      sort INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_zh TEXT NOT NULL DEFAULT '',
      question_en TEXT NOT NULL DEFAULT '',
      question_ru TEXT NOT NULL DEFAULT '',
      answer_zh TEXT NOT NULL DEFAULT '',
      answer_en TEXT NOT NULL DEFAULT '',
      answer_ru TEXT NOT NULL DEFAULT '',
      is_public INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS team_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_zh TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL DEFAULT '',
      title_ru TEXT NOT NULL DEFAULT '',
      body_zh TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_ru TEXT NOT NULL DEFAULT '',
      headcount TEXT NOT NULL DEFAULT '',
      is_verified INTEGER NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS warehouse_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_zh TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL DEFAULT '',
      title_ru TEXT NOT NULL DEFAULT '',
      body_zh TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_ru TEXT NOT NULL DEFAULT '',
      is_verified INTEGER NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS page_seo (
      path TEXT NOT NULL,
      locale TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (path, locale)
    );

    CREATE TABLE IF NOT EXISTS i18n_overrides (
      locale TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (locale, key)
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      company TEXT NOT NULL DEFAULT '',
      contact_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      locale TEXT NOT NULL DEFAULT 'zh',
      kind TEXT NOT NULL DEFAULT 'rfq',
      status TEXT NOT NULL DEFAULT 'new',
      internal_note TEXT NOT NULL DEFAULT '',
      notification_status TEXT NOT NULL DEFAULT 'pending',
      notification_detail TEXT NOT NULL DEFAULT '',
      ip_hash TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      dedupe_key TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_inquiries_dedupe ON inquiries(dedupe_key, created_at DESC);

    CREATE TABLE IF NOT EXISTS inquiry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      mpn TEXT NOT NULL,
      mpn_norm TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      qty INTEGER,
      note TEXT NOT NULL DEFAULT '',
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_items_inquiry ON inquiry_items(inquiry_id);

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      stored_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime TEXT NOT NULL DEFAULT '',
      size INTEGER NOT NULL DEFAULT 0,
      sha256 TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_inquiry ON attachments(inquiry_id);

    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      mpn TEXT NOT NULL,
      mpn_norm TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      package TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      moq INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_brand_mpn
      ON parts(brand, mpn_norm) WHERE external_id IS NULL;

    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      mapping TEXT NOT NULL DEFAULT '{}',
      rows TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      applied_at TEXT
    );

    CREATE TABLE IF NOT EXISTS import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      mode TEXT NOT NULL,
      created INTEGER NOT NULL DEFAULT 0,
      updated INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  try {
    db.exec("ALTER TABLE inquiries ADD COLUMN kind TEXT NOT NULL DEFAULT 'rfq'");
  } catch {
    /* column already exists */
  }

  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

function seedIfEmpty(db) {
  const count = Number(db.prepare("SELECT COUNT(*) AS n FROM categories").get().n);
  if (count > 0) return false;
  const seed = readSeed();
  const now = new Date().toISOString();

  const insertConfig = db.prepare(
    "INSERT OR REPLACE INTO site_config (key, value, updated_at) VALUES (?, ?, ?)"
  );
  for (const [key, value] of Object.entries(seed.siteConfig || {})) {
    insertConfig.run(key, JSON.stringify(value), now);
  }

  const insertCategory = db.prepare(
    `INSERT INTO categories (slug, name_zh, name_en, name_ru, blurb_zh, blurb_en, blurb_ru, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const c of seed.categories || []) {
    insertCategory.run(
      c.slug,
      c.name_zh,
      c.name_en,
      c.name_ru,
      c.blurb_zh || "",
      c.blurb_en || "",
      c.blurb_ru || "",
      c.sort ?? 100
    );
  }

  const insertBrand = db.prepare(
    `INSERT INTO brands (slug, name, legal_name, logo_key, brand_color, website, categories,
      supply_relation, supply_note, internal_note, is_public, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const b of seed.brands || []) {
    insertBrand.run(
      b.slug,
      b.name,
      b.legal_name || "",
      b.logo_key || "",
      b.brand_color || "#17191C",
      b.website || "",
      b.categories || "",
      b.supply_relation || "to_be_confirmed",
      b.supply_note || "",
      b.internal_note || "",
      b.is_public ? 1 : 0,
      b.sort ?? 100
    );
  }

  const insertService = db.prepare(
    `INSERT INTO services (slug, title_zh, title_en, title_ru, body_zh, body_en, body_ru,
      note_zh, note_en, note_ru, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const s of seed.services || []) {
    insertService.run(
      s.slug,
      s.title_zh,
      s.title_en,
      s.title_ru,
      s.body_zh || "",
      s.body_en || "",
      s.body_ru || "",
      s.note_zh || "",
      s.note_en || "",
      s.note_ru || "",
      s.sort ?? 100
    );
  }

  const insertFaq = db.prepare(
    `INSERT INTO faqs (question_zh, question_en, question_ru, answer_zh, answer_en, answer_ru,
      is_public, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const f of seed.faqs || []) {
    insertFaq.run(
      f.question_zh,
      f.question_en || "",
      f.question_ru || "",
      f.answer_zh,
      f.answer_en || "",
      f.answer_ru || "",
      f.is_public === false ? 0 : 1,
      f.sort ?? 100
    );
  }

  const insertRole = db.prepare(
    `INSERT INTO team_roles (title_zh, title_en, title_ru, body_zh, body_en, body_ru,
      headcount, is_verified, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const r of seed.teamRoles || []) {
    insertRole.run(
      r.title_zh,
      r.title_en || "",
      r.title_ru || "",
      r.body_zh || "",
      r.body_en || "",
      r.body_ru || "",
      r.headcount || "",
      r.is_verified ? 1 : 0,
      r.sort ?? 100
    );
  }

  const insertWarehouse = db.prepare(
    `INSERT INTO warehouse_items (title_zh, title_en, title_ru, body_zh, body_en, body_ru,
      is_verified, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const w of seed.warehouseItems || []) {
    insertWarehouse.run(
      w.title_zh,
      w.title_en || "",
      w.title_ru || "",
      w.body_zh || "",
      w.body_en || "",
      w.body_ru || "",
      w.is_verified ? 1 : 0,
      w.sort ?? 100
    );
  }

  const insertSeo = db.prepare(
    "INSERT INTO page_seo (path, locale, title, description) VALUES (?, ?, ?, ?)"
  );
  for (const s of seed.seo || []) {
    insertSeo.run(s.path, s.locale, s.title || "", s.description || "");
  }

  return true;
}

let cached = globalThis.__chipDb;

export function getDb() {
  if (cached && cached.db) return cached.db;
  ensureDir(DATA_DIR);
  ensureDir(path.join(DATA_DIR, "..", "private", "uploads"));
  const db = new DatabaseSync(DB_FILE);
  migrate(db);
  seedIfEmpty(db);
  cached = globalThis.__chipDb = { db, file: DB_FILE };
  return db;
}

export function dbPath() {
  return DB_FILE;
}

/* ---------------- content ---------------- */

export function getConfig() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM site_config").all();
  const out = {};
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      out[row.key] = row.value;
    }
  }
  return out;
}

export function setConfig(patch, actor = "system") {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    "INSERT INTO site_config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  );
  for (const [key, value] of Object.entries(patch)) {
    stmt.run(key, JSON.stringify(value), now);
  }
  audit(actor, "config.update", "site_config", Object.keys(patch).join(","));
}

/** Public brand projection: no internal relations, notes or verification flags. */
export function listPublicBrands() {
  const db = getDb();
  return db
    .prepare(
      `SELECT slug, name, legal_name, logo_key, brand_color, website, categories
       FROM brands WHERE is_public = 1 ORDER BY sort ASC, name ASC`
    )
    .all()
    .map((b) => ({ ...b }));
}

export function listAllBrands() {
  return getDb()
    .prepare("SELECT * FROM brands ORDER BY sort ASC, id ASC")
    .all()
    .map((b) => ({ ...b }));
}

export function listCategories() {
  return getDb().prepare("SELECT * FROM categories ORDER BY sort ASC, id ASC").all().map((r) => ({ ...r }));
}

export function listServices() {
  return getDb().prepare("SELECT * FROM services ORDER BY sort ASC, id ASC").all().map((r) => ({ ...r }));
}

export function listFaqs() {
  return getDb()
    .prepare("SELECT * FROM faqs WHERE is_public = 1 ORDER BY sort ASC, id ASC")
    .all()
    .map((r) => ({ ...r }));
}

export function listAllFaqs() {
  return getDb().prepare("SELECT * FROM faqs ORDER BY sort ASC, id ASC").all().map((r) => ({ ...r }));
}

export function listTeamRoles() {
  return getDb().prepare("SELECT * FROM team_roles ORDER BY sort ASC, id ASC").all().map((r) => ({ ...r }));
}

export function listWarehouseItems() {
  return getDb().prepare("SELECT * FROM warehouse_items ORDER BY sort ASC, id ASC").all().map((r) => ({ ...r }));
}

export function listSeo() {
  return getDb().prepare("SELECT * FROM page_seo").all().map((r) => ({ ...r }));
}

export function getSeo(pathname, locale) {
  const row = getDb()
    .prepare("SELECT * FROM page_seo WHERE path = ? AND locale = ?")
    .get(pathname, locale);
  return row ? { ...row } : null;
}

/** Localised content helper used by every public page. */
export function localized(row, base, locale) {
  return pickLocalized(row, base, locale);
}

/* ---------------- inquiries ---------------- */

export const INQUIRY_STATUSES = ["new", "in_progress", "replied", "closed"];

function makeCode() {
  const db = getDb();
  for (let i = 0; i < 8; i++) {
    const code = formatInquiryCode(new Date(), crypto.randomBytes(3).toString("hex"));
    const hit = db.prepare("SELECT 1 FROM inquiries WHERE code = ?").get(code);
    if (!hit) return code;
  }
  return `RFQ-${Date.now()}`;
}

export function createInquiry(values, meta = {}) {
  const db = getDb();
  const now = new Date().toISOString();
  const code = makeCode();
  const dedupeKey = meta.dedupeKey || "";

  db.exec("BEGIN");
  try {
    const result = db
      .prepare(
        `INSERT INTO inquiries (code, company, contact_name, email, phone, whatsapp, country,
          message, locale, kind, status, notification_status, ip_hash, user_agent, dedupe_key,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'pending', ?, ?, ?, ?, ?)`
      )
      .run(
        code,
        values.company || "",
        values.contactName || "",
        values.email || "",
        values.phone || "",
        values.whatsapp || "",
        values.country || "",
        values.message || "",
        values.locale || "zh",
        meta.kind || "rfq",
        meta.ipHash || "",
        String(meta.userAgent || "").slice(0, 300),
        dedupeKey,
        now,
        now
      );
    const inquiryId = Number(result.lastInsertRowid);
    const stmt = db.prepare(
      "INSERT INTO inquiry_items (inquiry_id, mpn, mpn_norm, brand, qty, note, sort) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    (values.items || []).forEach((item, index) => {
      stmt.run(
        inquiryId,
        item.mpn,
        meta.normalizeMpn ? meta.normalizeMpn(item.mpn) : item.mpn.toUpperCase(),
        item.brand || "",
        item.qty ?? null,
        item.note || "",
        index
      );
    });
    db.exec("COMMIT");
    return { id: inquiryId, code, createdAt: now };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function findRecentDuplicate(dedupeKey, withinMinutes = 10) {
  if (!dedupeKey) return null;
  const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  const row = getDb()
    .prepare(
      "SELECT id, code, created_at FROM inquiries WHERE dedupe_key = ? AND created_at >= ? ORDER BY id DESC LIMIT 1"
    )
    .get(dedupeKey, since);
  return row ? { ...row } : null;
}

export function addAttachment(record) {
  const db = getDb();
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `INSERT INTO attachments (inquiry_id, stored_name, original_name, mime, size, sha256, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.inquiryId,
      record.storedName,
      record.originalName,
      record.mime || "",
      record.size || 0,
      record.sha256 || "",
      now
    );
  return Number(res.lastInsertRowid);
}

export function setNotificationStatus(inquiryId, status, detail = "") {
  getDb()
    .prepare("UPDATE inquiries SET notification_status = ?, notification_detail = ? WHERE id = ?")
    .run(status, detail.slice(0, 500), inquiryId);
}

export function listInquiries({ status, q, limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const where = [];
  const params = [];
  if (status && INQUIRY_STATUSES.includes(status)) {
    where.push("i.status = ?");
    params.push(status);
  }
  if (q) {
    where.push("(i.code LIKE ? OR i.company LIKE ? OR i.email LIKE ? OR i.contact_name LIKE ? OR EXISTS (SELECT 1 FROM inquiry_items it WHERE it.inquiry_id = i.id AND it.mpn LIKE ?))");
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT i.*, (SELECT COUNT(*) FROM inquiry_items it WHERE it.inquiry_id = i.id) AS item_count,
        (SELECT COUNT(*) FROM attachments a WHERE a.inquiry_id = i.id) AS attachment_count
       FROM inquiries i ${clause}
       ORDER BY i.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  const total = Number(
    db.prepare(`SELECT COUNT(*) AS n FROM inquiries i ${clause}`).get(...params).n
  );
  return { rows: rows.map((r) => ({ ...r })), total };
}

export function getInquiry(id) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(id);
  if (!row) return null;
  const items = db
    .prepare("SELECT * FROM inquiry_items WHERE inquiry_id = ? ORDER BY sort ASC, id ASC")
    .all(id);
  const attachments = db
    .prepare("SELECT id, original_name, mime, size, created_at FROM attachments WHERE inquiry_id = ? ORDER BY id ASC")
    .all(id);
  return { ...row, items: items.map((i) => ({ ...i })), attachments: attachments.map((a) => ({ ...a })) };
}

export function updateInquiry(id, patch, actor = "admin") {
  const db = getDb();
  const now = new Date().toISOString();
  const fields = [];
  const params = [];
  if (patch.status && INQUIRY_STATUSES.includes(patch.status)) {
    fields.push("status = ?");
    params.push(patch.status);
  }
  if (typeof patch.internalNote === "string") {
    fields.push("internal_note = ?");
    params.push(patch.internalNote.slice(0, 4000));
  }
  if (!fields.length) return false;
  fields.push("updated_at = ?");
  params.push(now);
  params.push(id);
  const res = db.prepare(`UPDATE inquiries SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  audit(actor, "inquiry.update", `inquiry:${id}`, JSON.stringify(patch).slice(0, 400));
  return Number(res.changes) > 0;
}

export function getAttachment(id) {
  const row = getDb().prepare("SELECT * FROM attachments WHERE id = ?").get(id);
  return row ? { ...row } : null;
}

export function countInquiriesByStatus() {
  const rows = getDb().prepare("SELECT status, COUNT(*) AS n FROM inquiries GROUP BY status").all();
  const out = { new: 0, in_progress: 0, replied: 0, closed: 0, total: 0 };
  for (const row of rows) {
    out[row.status] = Number(row.n);
    out.total += Number(row.n);
  }
  return out;
}

/* ---------------- parts / import ---------------- */

export function countParts() {
  return Number(getDb().prepare("SELECT COUNT(*) AS n FROM parts").get().n);
}

export function findPartsByKeys(keys) {
  const db = getDb();
  const out = {};
  const byId = db.prepare("SELECT * FROM parts WHERE external_id = ?");
  const byMpn = db.prepare(
    "SELECT * FROM parts WHERE UPPER(REPLACE(REPLACE(brand, ' ', ''), '.', '')) = ? AND mpn_norm = ?"
  );
  for (const key of keys) {
    if (key.startsWith("id:")) {
      const row = byId.get(key.slice(3));
      if (row) out[key] = { ...row };
    } else {
      const [brand, mpn] = key.slice(4).split("::");
      const row = byMpn.get(brand, mpn);
      if (row) out[key] = { ...row };
    }
  }
  return out;
}

export function applyImportRow(row, existingId, mode) {
  const db = getDb();
  const now = new Date().toISOString();
  const v = row.values;
  if (mode === "create" || !existingId) {
    if (v.external_id) {
      db.prepare(
        `INSERT INTO parts (external_id, mpn, mpn_norm, brand, package, category, description, moq, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(external_id) DO UPDATE SET mpn=excluded.mpn, mpn_norm=excluded.mpn_norm,
           brand=excluded.brand, package=excluded.package, category=excluded.category,
           description=excluded.description, moq=excluded.moq, updated_at=excluded.updated_at`
      ).run(
        v.external_id,
        v.mpn,
        require_normalize(v.mpn),
        v.brand,
        v.package,
        v.category,
        v.description,
        row.moq ?? null,
        now,
        now
      );
    } else {
      db.prepare(
        `INSERT INTO parts (external_id, mpn, mpn_norm, brand, package, category, description, moq, created_at, updated_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        v.mpn,
        require_normalize(v.mpn),
        v.brand,
        v.package,
        v.category,
        v.description,
        row.moq ?? null,
        now,
        now
      );
    }
    return "created";
  }
  db.prepare(
    `UPDATE parts SET mpn = ?, mpn_norm = ?, brand = ?, package = ?, category = ?,
      description = ?, moq = ?, updated_at = ? WHERE id = ?`
  ).run(
    v.mpn || "",
    require_normalize(v.mpn),
    v.brand || "",
    v.package || "",
    v.category || "",
    v.description || "",
    row.moq ?? null,
    now,
    existingId
  );
  return "updated";
}

function require_normalize(mpn) {
  return normalizeMpn(mpn);
}

export function logImport(entry) {
  getDb()
    .prepare(
      `INSERT INTO import_log (filename, mode, created, updated, skipped, failed, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      entry.filename,
      entry.mode,
      entry.created || 0,
      entry.updated || 0,
      entry.skipped || 0,
      entry.failed || 0,
      entry.detail || "",
      new Date().toISOString()
    );
}

export function listImports(limit = 20) {
  return getDb()
    .prepare("SELECT * FROM import_log ORDER BY id DESC LIMIT ?")
    .all(limit)
    .map((r) => ({ ...r }));
}

export function createImportBatch(record) {
  const res = getDb()
    .prepare(
      `INSERT INTO import_batches (token, filename, mapping, rows, summary, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.token,
      record.filename,
      JSON.stringify(record.mapping || {}),
      JSON.stringify(record.rows || []),
      JSON.stringify(record.summary || {}),
      record.createdBy || "",
      new Date().toISOString()
    );
  return Number(res.lastInsertRowid);
}

export function getImportBatch(token) {
  const row = getDb().prepare("SELECT * FROM import_batches WHERE token = ?").get(token);
  return row ? { ...row } : null;
}

export function markImportBatchApplied(token) {
  getDb()
    .prepare("UPDATE import_batches SET applied_at = ? WHERE token = ?")
    .run(new Date().toISOString(), token);
}

/* ---------------- admin users / audit ---------------- */

export function findAdminByEmail(email) {
  const row = getDb().prepare("SELECT * FROM admin_users WHERE email = ?").get(String(email).toLowerCase());
  return row ? { ...row } : null;
}

export function createAdmin({ email, name, passwordHash, role = "owner" }) {
  const res = getDb()
    .prepare("INSERT INTO admin_users (email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(String(email).toLowerCase(), name || "Admin", role, passwordHash, new Date().toISOString());
  return Number(res.lastInsertRowid);
}

export function countAdmins() {
  return Number(getDb().prepare("SELECT COUNT(*) AS n FROM admin_users").get().n);
}

export function audit(actor, action, target = "", detail = "") {
  try {
    getDb()
      .prepare("INSERT INTO audit_log (actor, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(actor, action, target, detail, new Date().toISOString());
  } catch {
    /* auditing must never break the request */
  }
}

export function recentAudit(limit = 20) {
  return getDb().prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?").all(limit).map((r) => ({ ...r }));
}
