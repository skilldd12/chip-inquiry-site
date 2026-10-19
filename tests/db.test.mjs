import { test, after } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(os.tmpdir(), `chip-db-test-${Date.now()}`);
process.env.DATA_DIR = DATA_DIR;

const db = await import("../lib/db.js");

after(() => {
  try {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  } catch {
    /* best-effort cleanup */
  }
});

test("database seeds catalogue content on first run", () => {
  assert.ok(db.listPublicBrands().length >= 10);
  assert.ok(db.listCategories().length >= 10);
  assert.ok(db.listServices().length >= 4);
  assert.ok(db.listFaqs().length >= 5);
});

test("public brand projection never exposes supply relations or notes", () => {
  const brand = db.listPublicBrands()[0];
  assert.ok(brand.name);
  assert.equal("supply_relation" in brand, false);
  assert.equal("internal_note" in brand, false);
  assert.equal("supply_note" in brand, false);
});

test("an inquiry is persisted with its line items", () => {
  const created = db.createInquiry(
    {
      company: "Test GmbH",
      contactName: "Alex",
      email: "alex@example.com",
      phone: "",
      country: "DE",
      message: "2024+ date code",
      locale: "en",
      items: [
        { mpn: "STM32F103C8T6", brand: "ST", qty: 500, note: "LQFP-48" },
        { mpn: "LM358DR", brand: "TI", qty: 2000, note: "" },
      ],
    },
    { dedupeKey: "alex@example.com|STM32F103C8T6", ipHash: "abc", kind: "rfq", normalizeMpn: (m) => m.toUpperCase() }
  );

  assert.match(created.code, /^RFQ-\d{6}-[A-F0-9]{4}$/);
  const record = db.getInquiry(created.id);
  assert.equal(record.items.length, 2);
  assert.equal(record.items[0].qty, 500);
  assert.equal(record.status, "new");
  assert.equal(record.notification_status, "pending");
});

test("recent duplicates are detected inside the window", () => {
  const dup = db.findRecentDuplicate("alex@example.com|STM32F103C8T6", 10);
  assert.ok(dup);
  assert.equal(db.findRecentDuplicate("nobody@example.com|X", 10), null);
});

test("status and internal notes update and are counted", () => {
  const list = db.listInquiries({});
  const id = list.rows[0].id;
  assert.equal(db.updateInquiry(id, { status: "in_progress", internalNote: "checking channel" }, "tester"), true);
  const record = db.getInquiry(id);
  assert.equal(record.status, "in_progress");
  assert.equal(record.internal_note, "checking channel");

  const counts = db.countInquiriesByStatus();
  assert.equal(counts.in_progress, 1);
  assert.equal(counts.total, 1);
});

test("invalid status values are ignored", () => {
  const list = db.listInquiries({});
  const id = list.rows[0].id;
  db.updateInquiry(id, { status: "deleted_hack" }, "tester");
  assert.equal(db.getInquiry(id).status, "in_progress");
});

test("attachments stay linked to their inquiry", () => {
  const list = db.listInquiries({});
  const id = list.rows[0].id;
  const attachmentId = db.addAttachment({
    inquiryId: id,
    storedName: "2026-10/test.csv",
    originalName: "bom.csv",
    mime: "text/csv",
    size: 42,
    sha256: "deadbeef",
  });
  assert.ok(attachmentId > 0);
  const record = db.getInquiry(id);
  assert.equal(record.attachments.length, 1);
  assert.equal(record.attachments[0].original_name, "bom.csv");
  assert.equal(db.getAttachment(attachmentId).stored_name, "2026-10/test.csv");
});

test("parts import dedupes by external id and by brand + normalised MPN", () => {
  db.applyImportRow(
    { values: { external_id: "EXT-9", mpn: "0012345", brand: "Example", package: "0603", category: "", description: "" }, moq: 100 },
    null,
    "create"
  );
  const found = db.findPartsByKeys(["id:EXT-9", "mpn:EXAMPLE::0012345"]);
  assert.ok(found["id:EXT-9"]);
  assert.ok(found["mpn:EXAMPLE::0012345"]);
  assert.equal(found["id:EXT-9"].mpn, "0012345");

  db.applyImportRow(
    { values: { mpn: "0012345", brand: "Example", package: "0603", category: "", description: "" }, moq: 100 },
    null,
    "create"
  );
  assert.equal(db.countParts(), 2);
});

test("inquiry filters work by status and query", () => {
  const byStatus = db.listInquiries({ status: "in_progress" });
  assert.equal(byStatus.total, 1);
  const byQuery = db.listInquiries({ q: "STM32" });
  assert.equal(byQuery.total, 1);
  const none = db.listInquiries({ q: "no-such-mpn" });
  assert.equal(none.total, 0);
});
