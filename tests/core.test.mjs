import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csvCell,
  toCsv,
  validateInquiry,
  validateImportRow,
  planImport,
  importSummary,
  normalizeMpn,
  isAllowedUpload,
  pickLocalized,
  formatInquiryCode,
} from "../lib/core.js";

test("MPN normalisation keeps leading zeros and suffixes", () => {
  assert.equal(normalizeMpn("  stm32f103c8t6 "), "STM32F103C8T6");
  assert.equal(normalizeMpn("0012345"), "0012345");
  assert.equal(normalizeMpn("RC0603FR-0710KL"), "RC0603FR-0710KL");
  assert.equal(normalizeMpn("LM\u200B358DR"), "LM358DR");
});

test("inquiry requires a part line or an attachment", () => {
  const missing = validateInquiry({ email: "buyer@example.com" }, { hasAttachment: false });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.items, "items_required");

  const withBom = validateInquiry({ email: "buyer@example.com" }, { hasAttachment: true });
  assert.equal(withBom.ok, true);
});

test("inquiry requires at least one contact channel", () => {
  const result = validateInquiry({ items: [{ mpn: "STM32F103C8T6" }] }, {});
  assert.equal(result.ok, false);
  assert.equal(result.errors.contact, "contact_required");
});

test("invalid email and phone are rejected", () => {
  const result = validateInquiry(
    { items: [{ mpn: "LM358DR" }], email: "not-an-email", phone: "12" },
    {}
  );
  assert.equal(result.errors.email, "email_invalid");
  assert.equal(result.errors.phone, "phone_invalid");
});

test("quantity must be a positive integer", () => {
  const bad = validateInquiry(
    { items: [{ mpn: "LM358DR", qty: "0" }], email: "a@b.com" },
    {}
  );
  assert.equal(bad.errors["items.0.qty"], "qty_invalid");

  const good = validateInquiry(
    { items: [{ mpn: "LM358DR", qty: "1,500" }], email: "a@b.com" },
    {}
  );
  assert.equal(good.ok, true);
  assert.equal(good.values.items[0].qty, 1500);
});

test("CSV export neutralises formula injection", () => {
  assert.equal(csvCell("=HYPERLINK('http://x')"), "'=HYPERLINK('http://x')");
  assert.equal(csvCell("+1 555"), "'+1 555");
  assert.equal(csvCell("-5"), "'-5");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(csvCell("normal"), "normal");
  assert.equal(csvCell('has "quotes", comma'), '"has ""quotes"", comma"');
});

test("toCsv writes a header row and CRLF line endings", () => {
  const csv = toCsv(["code", "company"], [["RFQ-1", "=evil"]]);
  assert.ok(csv.startsWith("code,company\r\n"));
  assert.ok(csv.includes("'=evil"));
});

test("import rows keep leading zeros and validate MOQ", () => {
  const row = validateImportRow({ mpn: "0012345", brand: "Example", moq: "100" }, 2);
  assert.equal(row.ok, true);
  assert.equal(row.values.mpn, "0012345");
  assert.equal(row.moq, 100);

  const bad = validateImportRow({ mpn: "LM358DR", moq: "abc" }, 3);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.errors, ["moq_invalid"]);

  const missing = validateImportRow({ mpn: "" }, 4);
  assert.ok(missing.errors.includes("mpn_required"));
});

test("import planning distinguishes create / skip / conflict / update", () => {
  const rows = [
    validateImportRow({ external_id: "A1", mpn: "NEWPART" }, 2),
    validateImportRow({ external_id: "A2", mpn: "EXIST" }, 3),
    validateImportRow({ external_id: "A3", mpn: "CHANGED", package: "QFN" }, 4),
    validateImportRow({ mpn: "" }, 5),
  ];
  const existing = {
    "id:A2": { id: 9, mpn: "EXIST", brand: "", package: "", category: "", description: "" },
    "id:A3": { id: 10, mpn: "CHANGED", brand: "", package: "LQFP", category: "", description: "" },
  };

  const createOnly = planImport(rows, existing, "create_only");
  assert.equal(createOnly[0].action, "create");
  assert.equal(createOnly[1].action, "skip");
  assert.equal(createOnly[2].action, "conflict");
  assert.deepEqual(createOnly[2].changes, ["package"]);
  assert.equal(createOnly[3].action, "error");

  const update = planImport(rows, existing, "update");
  assert.equal(update[2].action, "update");
  assert.equal(update[2].existingId, 10);

  const summary = importSummary(createOnly);
  assert.equal(summary.total, 4);
  assert.equal(summary.create, 1);
});

test("duplicate rows inside one file are skipped once", () => {
  const rows = [
    validateImportRow({ external_id: "X1", mpn: "SAME" }, 2),
    validateImportRow({ external_id: "X1", mpn: "SAME" }, 3),
  ];
  const planned = planImport(rows, {}, "create_only");
  assert.equal(planned[0].action, "create");
  assert.equal(planned[1].action, "skip");
  assert.equal(planned[1].duplicateRow, true);
});

test("upload sniffing rejects a renamed binary", () => {
  const pdf = Buffer.from("%PDF-1.7\n", "utf8");
  assert.equal(isAllowedUpload("bom.pdf", "application/pdf", pdf).ok, true);

  const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);
  const renamed = isAllowedUpload("bom.pdf", "application/pdf", exe);
  assert.equal(renamed.ok, false);
  assert.equal(renamed.reason, "content");

  assert.equal(isAllowedUpload("bom.exe", "application/octet-stream", exe).ok, false);
});

test("locale fallback goes locale → en → zh", () => {
  const row = { title_en: "English only", title_zh: "中文" };
  assert.equal(pickLocalized(row, "title", "ru"), "English only");
  assert.equal(pickLocalized({ title_zh: "只有中文" }, "title", "ru"), "只有中文");
  assert.equal(pickLocalized({}, "title", "en"), "");
});

test("inquiry codes are readable and stable in shape", () => {
  const code = formatInquiryCode(new Date("2026-10-19T00:00:00Z"), "ab12cd");
  assert.match(code, /^RFQ-261019-AB12$/);
});
