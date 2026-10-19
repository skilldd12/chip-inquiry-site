/**
 * Pure protocol helpers shared by the public form, the admin console,
 * the import pipeline and the test suite.
 *
 * Plain ESM JS on purpose: the same module can be imported by Next (TS) and
 * executed directly by `node --test` without a build step.
 */

export const LOCALES = ["zh", "en", "ru"];
export const DEFAULT_LOCALE = "zh";

/** Collapse whitespace, strip zero-width characters, keep the raw string. */
export function cleanText(value, max = 500) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

/**
 * MPN normalisation. Never removes leading zeros, never reorders suffixes.
 * Used only for matching, the original string is always stored separately.
 */
export function normalizeMpn(value) {
  return cleanText(value, 120)
    .toUpperCase()
    .replace(/[\s\u00A0]+/g, "")
    .replace(/[‐‑‒–—−]/g, "-");
}

export function normalizeBrand(value) {
  return cleanText(value, 80)
    .toUpperCase()
    .replace(/[\s\u00A0.]+/g, "");
}

export function dedupeKey(brand, mpn) {
  return `${normalizeBrand(brand)}::${normalizeMpn(mpn)}`;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:]+@[^\s@<>()[\]\\,;:]+\.[A-Za-z]{2,}$/;
const PHONE_RE = /^[+()\d][\d\s()\-.]{5,}$/;

export function isValidEmail(value) {
  const v = cleanText(value, 160);
  return v.length <= 160 && EMAIL_RE.test(v);
}

export function isValidPhone(value) {
  const v = cleanText(value, 40);
  if (!PHONE_RE.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 20;
}

export function parseQty(value) {
  const raw = cleanText(value, 20).replace(/[, ]/g, "");
  if (!raw) return { ok: true, value: null };
  if (!/^\d{1,9}$/.test(raw)) return { ok: false, value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > 1_000_000_000) {
    return { ok: false, value: null };
  }
  return { ok: true, value: n };
}

/** max 20 line items; each needs an MPN. */
export const MAX_ITEMS = 20;
export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export const ALLOWED_UPLOADS = {
  "application/pdf": ["pdf"],
  "text/csv": ["csv"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/plain": ["txt"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "csv",
  "xls",
  "xlsx",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "webp",
];

/**
 * Request validation, mirrored on the server. The attachment requirement is
 * resolved separately because files arrive as a multipart stream.
 */
export function validateInquiry(input, { hasAttachment = false } = {}) {
  const errors = {};
  const values = {};

  const items = Array.isArray(input.items) ? input.items.slice(0, MAX_ITEMS) : [];
  const cleanedItems = [];
  items.forEach((item, index) => {
    const mpn = cleanText(item?.mpn, 120);
    if (!mpn) return;
    const qty = parseQty(item?.qty);
    if (!qty.ok) {
      errors[`items.${index}.qty`] = "qty_invalid";
    }
    cleanedItems.push({
      mpn,
      brand: cleanText(item?.brand, 80),
      qty: qty.value,
      note: cleanText(item?.note, 200),
    });
  });

  if (cleanedItems.length === 0 && !hasAttachment) {
    errors.items = "items_required";
  }
  if (cleanedItems.length > 0) values.items = cleanedItems;

  const contactName = cleanText(input.contactName, 80);
  if (contactName) values.contactName = contactName;

  const company = cleanText(input.company, 120);
  if (company) values.company = company;

  const email = cleanText(input.email, 160);
  if (email && !isValidEmail(email)) errors.email = "email_invalid";
  if (email) values.email = email;

  const phone = cleanText(input.phone, 40);
  if (phone && !isValidPhone(phone)) errors.phone = "phone_invalid";
  if (phone) values.phone = phone;

  if (!email && !phone) {
    errors.contact = "contact_required";
  }

  const whatsapp = cleanText(input.whatsapp, 40);
  if (whatsapp) values.whatsapp = whatsapp;

  const country = cleanText(input.country, 80);
  if (country) values.country = country;

  const message = cleanText(input.message, 4000);
  if (message) values.message = message;

  const companyWebsite = cleanText(input.website, 200);
  if (companyWebsite) values.website = companyWebsite;

  values.locale = LOCALES.includes(input.locale) ? input.locale : DEFAULT_LOCALE;
  values.marketingOptIn = input.marketingOptIn === true || input.marketingOptIn === "on";

  return { ok: Object.keys(errors).length === 0, errors, values };
}

/** Display-safe company reference, e.g. RFQ-261019-4F2A. */
export function formatInquiryCode(date, randomHex) {
  const d = date instanceof Date ? date : new Date(date);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `RFQ-${yy}${mm}${dd}-${String(randomHex).toUpperCase().slice(0, 4)}`;
}

/**
 * CSV cell escaping. Blocks spreadsheet formula injection by prefixing a
 * single quote, then applies RFC4180 quoting.
 */
export function csvCell(value, { guardFormula = true } = {}) {
  let s = value === null || value === undefined ? "" : String(value);
  if (guardFormula && /^[\s]*[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers, rows, opts = {}) {
  const head = headers.map((h) => csvCell(h, opts)).join(",");
  const body = rows
    .map((row) => row.map((cell) => csvCell(cell, opts)).join(","))
    .join("\r\n");
  return `${head}\r\n${body}\r\n`;
}

/** Filename sanitisation for the private upload directory. */
export function safeExtension(filename) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(filename || ""));
  return m ? m[1].toLowerCase() : "";
}

export function stripExtension(filename) {
  return String(filename || "").replace(/\.[A-Za-z0-9]{1,8}$/, "");
}

/** Magic-byte check so a renamed .exe cannot pass as a PDF. */
export function sniffFileKind(buffer) {
  const b = buffer;
  if (!b || b.length < 4) return "unknown";
  const hex = b.subarray(0, 8).toString("hex").toLowerCase();
  if (hex.startsWith("25504446")) return "pdf";
  if (hex.startsWith("504b0304")) return "zip"; // xlsx / docx container
  if (hex.startsWith("d0cf11e0a1b11ae1")) return "cfb"; // legacy xls
  if (hex.startsWith("89504e47")) return "png";
  if (hex.startsWith("ffd8ff")) return "jpeg";
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP")
    return "webp";
  return "text";
}

export function isAllowedUpload(filename, mimetype, buffer) {
  const ext = safeExtension(filename);
  if (!ALLOWED_EXTENSIONS.includes(ext)) return { ok: false, reason: "extension" };
  const kind = sniffFileKind(buffer);
  const byExt = {
    pdf: ["pdf"],
    xlsx: ["zip"],
    xls: ["cfb"],
    csv: ["text"],
    txt: ["text"],
    png: ["png"],
    jpg: ["jpeg"],
    jpeg: ["jpeg"],
    webp: ["webp"],
  }[ext];
  if (!byExt) return { ok: false, reason: "extension" };
  if (!byExt.includes(kind)) return { ok: false, reason: "content" };
  // A declared MIME that contradicts the extension is rejected, but browsers
  // often send octet-stream for csv/xls so that value is tolerated.
  const declared = String(mimetype || "").toLowerCase();
  if (declared && declared !== "application/octet-stream") {
    const allowedMimes = Object.entries(ALLOWED_UPLOADS)
      .filter(([, exts]) => exts.includes(ext))
      .map(([m]) => m);
    if (allowedMimes.length && !allowedMimes.includes(declared)) {
      return { ok: false, reason: "mimetype" };
    }
  }
  return { ok: true, kind };
}

/** Locale fallback: requested → en → zh → first non-empty. */
export function pickLocalized(row, base, locale) {
  if (!row) return "";
  const order = [locale, "en", "zh", "ru"];
  for (const l of order) {
    const v = row[`${base}_${l}`];
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v);
  }
  return "";
}

export function hasTranslation(row, base, locale) {
  if (!row) return false;
  const v = row[`${base}_${locale}`];
  return v !== null && v !== undefined && String(v).trim() !== "";
}

/** Import header normalisation: "MPN " / "mpn" / "型号" map together. */
export const IMPORT_FIELDS = [
  { key: "external_id", aliases: ["external_id", "id", "外部id", "外部编号", "sku"] },
  { key: "mpn", aliases: ["mpn", "型号", "物料型号", "part number", "partnumber"] },
  { key: "brand", aliases: ["brand", "品牌", "厂商", "manufacturer", "mfr"] },
  { key: "package", aliases: ["package", "封装", "case"] },
  { key: "category", aliases: ["category", "类目", "分类"] },
  { key: "description", aliases: ["description", "描述", "说明"] },
  { key: "moq", aliases: ["moq", "最小起订量"] },
];

export function normalizeHeader(header) {
  return String(header || "")
    .replace(/[\s\u00A0]+/g, "")
    .replace(/[()（）]/g, "")
    .toLowerCase();
}

export function guessMapping(headers) {
  const map = {};
  headers.forEach((h) => {
    const n = normalizeHeader(h);
    if (!n) return;
    for (const field of IMPORT_FIELDS) {
      if (map[field.key]) continue;
      if (field.aliases.some((a) => normalizeHeader(a) === n)) {
        map[field.key] = h;
        break;
      }
    }
  });
  return map;
}

/**
 * Validate a single import row. `values` keeps the exact strings from the
 * sheet so leading zeros survive; `errors` are field-keyed codes.
 */
export function validateImportRow(raw, rowNumber) {
  const values = {
    external_id: cleanText(raw.external_id, 120),
    mpn: cleanText(raw.mpn, 120),
    brand: cleanText(raw.brand, 80),
    package: cleanText(raw.package, 60),
    category: cleanText(raw.category, 80),
    description: cleanText(raw.description, 500),
  };
  const errors = [];
  if (!values.mpn) errors.push("mpn_required");
  let moq = null;
  if (raw.moq !== undefined && raw.moq !== null && String(raw.moq).trim() !== "") {
    const q = parseQty(raw.moq);
    if (!q.ok) errors.push("moq_invalid");
    else moq = q.value;
  }
  return {
    rowNumber,
    ok: errors.length === 0,
    errors,
    values,
    moq,
    key: values.external_id
      ? `id:${values.external_id}`
      : `mpn:${dedupeKey(values.brand, values.mpn)}`,
  };
}

/**
 * Decide the action of every imported row against existing records.
 * Never silently overwrites: changed fields are reported for review.
 */
export function planImport(rows, existingByKey, mode = "create_only") {
  const seen = new Set();
  return rows.map((row) => {
    if (!row.ok) return { ...row, action: "error", changes: [] };
    if (seen.has(row.key)) {
      return { ...row, action: "skip", changes: [], duplicateRow: true };
    }
    seen.add(row.key);
    const existing = existingByKey[row.key];
    if (!existing) return { ...row, action: "create", changes: [] };
    const changes = ["mpn", "brand", "package", "category", "description"].filter(
      (f) => row.values[f] && row.values[f] !== (existing[f] ?? "")
    );
    if (changes.length === 0) return { ...row, action: "skip", changes: [] };
    if (mode === "update") return { ...row, action: "update", changes, existingId: existing.id };
    return { ...row, action: "conflict", changes, existingId: existing.id };
  });
}

export function importSummary(planned) {
  const summary = { create: 0, update: 0, skip: 0, conflict: 0, error: 0, total: planned.length };
  for (const row of planned) summary[row.action] = (summary[row.action] || 0) + 1;
  return summary;
}

/** Very small request throttle, per process. */
export function rateLimitKey(ip, windowMinutes = 15) {
  const bucket = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
  return `${ip}::${bucket}`;
}
