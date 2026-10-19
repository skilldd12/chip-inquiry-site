import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { parseEditorialConfig, validateEditorialConfig, isEditorialAssetPath } from "../lib/editorial-config.ts";

const media = {
  src: "/images/editorial/warehouse.webp", alt: { zh: "仓储", en: "Warehouse", ru: "Склад" },
  caption: { zh: "示意图片", en: "Illustrative image", ru: "Иллюстрация" },
  source: "AI generated", kind: "illustrative", position: "50% 50%",
};
const config = () => ({ media: { warehouse: structuredClone(media) }, pages: {
  "products/mcu-processors": { title: { zh: "处理器", en: "Processors", ru: "Процессоры" }, lead: { zh: "", en: "", ru: "" }, imageKey: "warehouse", relatedBrands: ["nxp"], relatedCategories: ["mcu-processors"] },
} });

test("editorial paths cannot load external URLs or traverse the asset directories", () => {
  for (const value of ["/images/a.webp", "/uploads/project/photo-01.JPG"]) assert.equal(isEditorialAssetPath(value), true);
  for (const value of ["https://example.com/a.webp", "//example.com/a.webp", "/images/../secret.png", "/images/%2e%2e/a.png", "/images/a.svg", "/images/a.png?remote=1", "/images/a.png#x"]) {
    assert.equal(isEditorialAssetPath(value), false, value);
    const input = config(); input.media.warehouse.src = value;
    assert.equal(validateEditorialConfig(input).ok, false, value);
  }
});

test("editorial schema supports localized content and rejects invalid focus, types and oversized data", () => {
  assert.equal(validateEditorialConfig(config()).ok, true);
  for (const position of ["-1% 50%", "101% 50%", "100.5% 50%", "center", "50% 50%;color:red"]) {
    const input = config(); input.media.warehouse.position = position;
    assert.equal(validateEditorialConfig(input).ok, false, position);
  }
  for (const input of [null, [], { ...config(), notification: { webhook_url: "secret" } }]) assert.equal(validateEditorialConfig(input).ok, false);
  const oversized = config(); oversized.pages["products/mcu-processors"].lead.en = "x".repeat(2001);
  assert.equal(validateEditorialConfig(oversized).ok, false);
});

test("invalid stored records fall back without discarding valid neighboring overrides", () => {
  const input = config(); input.media.broken = { ...media, src: "https://bad.test/image.png" };
  assert.deepEqual(parseEditorialConfig(input), config());
  assert.deepEqual(parseEditorialConfig(null), { media: {}, pages: {} });
});

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "editorial-config-test-"));
process.env.DATA_DIR = dataDir;
const db = await import("../lib/db.js");
const require = createRequire(import.meta.url);
// Execute the actual route with only its session provider replaced. Real SQLite and
// NextResponse are retained, while test data is isolated from the project database.
const authStub = `data:text/javascript,${encodeURIComponent("export async function requireAdmin() { return globalThis.__editorialTestSession; }")}`;
globalThis.__editorialRevalidations = [];
const cacheStub = `data:text/javascript,${encodeURIComponent("export function revalidatePath(...args) { globalThis.__editorialRevalidations.push(args); }")}`;
const routePath = new URL("../app/api/admin/config/route.ts", import.meta.url);
const source = fs.readFileSync(routePath, "utf8")
  .replace('"next/server"', JSON.stringify(pathToFileURL(require.resolve("next/server")).href))
  .replace('"next/cache"', JSON.stringify(cacheStub))
  .replace('"@/lib/auth"', JSON.stringify(authStub))
  .replace('"@/lib/db.js"', JSON.stringify(new URL("../lib/db.js", import.meta.url).href))
  .replace('"@/lib/editorial-config"', JSON.stringify(new URL("../lib/editorial-config.ts", import.meta.url).href));
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { POST } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
const request = (body, overrides = {}) => new Request("http://localhost/api/admin/config", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", ...overrides }, body: JSON.stringify(body) });

after(() => {
  delete globalThis.__editorialTestSession;
  delete globalThis.__editorialRevalidations;
  db.getDb().close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("config route authenticates editorial writes and retains unrelated config and webhook secrets", async () => {
  db.setConfig({ notification: { enabled: true, sales_email: "sales@example.test", webhook_url: "https://notify.example.test/private-token" }, future_key: { keep: true } });
  const before = db.getConfig();
  globalThis.__editorialTestSession = null;
  const revalidationsBefore = globalThis.__editorialRevalidations.length;
  assert.equal((await POST(request({ editorial: config() }))).status, 401);
  assert.equal(globalThis.__editorialRevalidations.length, revalidationsBefore);
  assert.deepEqual(db.getConfig(), before);
  globalThis.__editorialTestSession = { email: "test@example.test" };
  const response = await POST(request({ editorial: config() }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, keys: ["editorial"] });
  assert.deepEqual(globalThis.__editorialRevalidations.slice(revalidationsBefore), [["/[locale]", "layout"]]);
  const stored = db.getConfig();
  assert.deepEqual(stored.editorial, config());
  for (const [key, value] of Object.entries(before)) assert.deepEqual(stored[key], value, key);
  const invalid = config(); invalid.media.warehouse.src = "/images/../private.png";
  assert.equal((await POST(request({ editorial: invalid, company: { name_en: "Should not save" } }))).status, 400);
  assert.deepEqual(db.getConfig(), stored);
  assert.equal((await POST(request(null))).status, 400);
  assert.equal((await POST(request({}))).status, 400);
  assert.equal(globalThis.__editorialRevalidations.length, revalidationsBefore + 1, "invalid writes do not invalidate public pages");
});

test("config route rejects different ports, hostile or missing origins and non-JSON requests before parsing", async () => {
  globalThis.__editorialTestSession = { email: "test@example.test" };
  const before = db.getConfig();
  const revalidationsBefore = globalThis.__editorialRevalidations.length;
  for (const origin of ["http://localhost:4312", "https://evil.example", "null", ""]) {
    const req = request({ company: { name_en: "Cross-origin change" } }, { origin });
    if (!origin) req.headers.delete("origin");
    req.json = async () => { throw new Error("Rejected origin must not read request data"); };
    assert.equal((await POST(req)).status, 403, origin || "missing origin");
    assert.deepEqual(db.getConfig(), before);
  }
  for (const type of ["text/plain", "application/x-www-form-urlencoded", ""]) {
    const req = request({ company: { name_en: "Non-JSON change" } }, { "content-type": type });
    if (!type) req.headers.delete("content-type");
    req.json = async () => { throw new Error("Rejected content type must not read request data"); };
    assert.equal((await POST(req)).status, 415, type || "missing content type");
    assert.deepEqual(db.getConfig(), before);
  }
  assert.equal(globalThis.__editorialRevalidations.length, revalidationsBefore);
});

test("same-origin JSON company settings save remains compatible with the existing config editor", async () => {
  globalThis.__editorialTestSession = { email: "test@example.test" };
  const before = db.getConfig();
  const revalidationsBefore = globalThis.__editorialRevalidations.length;
  const response = await POST(request({
    company: { ...before.company, name_en: "Verified Company" },
    notification: before.notification,
    hero: before.hero,
    media: before.media,
    legal: before.legal,
  }, { "content-type": "application/json; charset=UTF-8" }));
  assert.equal(response.status, 200);
  const after = db.getConfig();
  assert.equal(after.company.name_en, "Verified Company");
  assert.deepEqual(after.editorial, before.editorial);
  assert.deepEqual(after.future_key, before.future_key);
  assert.deepEqual(after.notification, before.notification);
  assert.deepEqual(globalThis.__editorialRevalidations.slice(revalidationsBefore), [["/[locale]", "layout"]]);
});
