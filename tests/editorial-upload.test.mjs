import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { editorialImageExtension, saveEditorialImage, readEditorialForm, MAX_EDITORIAL_IMAGE_BYTES, MAX_EDITORIAL_BODY_BYTES } from "../lib/editorial-upload.ts";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "editorial-upload-test-"));
after(async () => { delete globalThis.__editorialMediaSession; await fs.rm(directory, { recursive: true, force: true }); });
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");

test("public image uploads use random filenames and preserve validated image bytes", async () => {
  const first = await saveEditorialImage(new File([png], "warehouse.png", { type: "image/png" }), directory);
  const second = await saveEditorialImage(new File([png], "warehouse.png", { type: "image/png" }), directory);
  assert.match(first, /^\/uploads\/editorial\/[a-f0-9]{36}\.png$/);
  assert.notEqual(first, second);
  assert.deepEqual(await fs.readFile(path.join(directory, path.basename(first))), png);
});

test("upload signatures recognize raster containers and reject SVG, scripts and type spoofing", async () => {
  assert.equal(editorialImageExtension(png), "png");
  const webp = Buffer.alloc(24); webp.write("RIFF"); webp.writeUInt32LE(16, 4); webp.write("WEBPVP8 ", 8);
  assert.equal(editorialImageExtension(webp), "webp");
  webp.writeUInt32LE(100, 4); assert.equal(editorialImageExtension(webp), null);
  const avif = Buffer.alloc(24); avif.writeUInt32BE(24); avif.write("ftypavif", 4);
  assert.equal(editorialImageExtension(avif), "avif");
  avif.write("heic", 8); assert.equal(editorialImageExtension(avif), null);
  const before = await fs.readdir(directory);
  for (const file of [
    new File(["<svg onload='alert(1)'/>"], "image.svg", { type: "image/svg+xml" }),
    new File(["<script>alert(1)</script>"], "image.png", { type: "image/png" }),
    new File([png], "../image.png", { type: "image/png" }),
    new File([png], "image.jpg", { type: "image/jpeg" }),
    new File([png], "image.png", { type: "text/html" }),
    new File([Buffer.alloc(MAX_EDITORIAL_IMAGE_BYTES + 1)], "image.png", { type: "image/png" }),
  ]) await assert.rejects(saveEditorialImage(file, directory));
  assert.deepEqual(await fs.readdir(directory), before);
});

test("multipart body limit is enforced even without a Content-Length header", async () => {
  let cancelled = false;
  const request = new Request("http://localhost/api/admin/media", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=test" }, duplex: "half", body: new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_EDITORIAL_BODY_BYTES + 1)); },
    cancel() { cancelled = true; },
  }) });
  await assert.rejects(readEditorialForm(request), (error) => error.status === 413);
  assert.equal(cancelled, true);
  const form = new FormData(); form.append("file", new File([png], "photo.png", { type: "image/png" }));
  const parsed = await readEditorialForm(new Request("http://localhost/api/admin/media", { method: "POST", body: form }));
  assert.equal(parsed.get("file").name, "photo.png");
});

test("media route requires authentication and a matching origin before reading or saving a file", async () => {
  const require = createRequire(import.meta.url);
  const auth = `data:text/javascript,${encodeURIComponent("export async function requireAdmin(){return globalThis.__editorialMediaSession}")}`;
  const database = `data:text/javascript,${encodeURIComponent("export function audit(){throw Error('must not write')} ")}`;
  const source = (await fs.readFile(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8"))
    .replace('"next/server"', JSON.stringify(pathToFileURL(require.resolve("next/server")).href))
    .replace('"@/lib/auth"', JSON.stringify(auth))
    .replace('"@/lib/db.js"', JSON.stringify(database))
    .replace('"@/lib/editorial-upload"', JSON.stringify(new URL("../lib/editorial-upload.ts", import.meta.url).href));
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { POST } = await import(`data:text/javascript,${encodeURIComponent(js)}`);
  globalThis.__editorialMediaSession = null;
  assert.equal((await POST(new Request("http://localhost/api/admin/media", { method: "POST" }))).status, 401);
  globalThis.__editorialMediaSession = { email: "test@example.test" };
  assert.equal((await POST(new Request("http://localhost/api/admin/media", { method: "POST", headers: { origin: "https://evil.example" } }))).status, 403);
  assert.equal((await POST(new Request("http://localhost/api/admin/media", { method: "POST" }))).status, 403);
  assert.equal((await POST(new Request("http://localhost/api/admin/media", { method: "POST", headers: { origin: "http://localhost" } }))).status, 400);
});
