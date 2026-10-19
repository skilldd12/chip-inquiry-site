/**
 * Private attachment storage. Files live outside /public and are only reachable
 * through an authenticated route that re-checks ownership in the database.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ALLOWED_EXTENSIONS, safeExtension, sniffFileKind } from "./core.js";

export const UPLOAD_ROOT = path.resolve(process.cwd(), "private/uploads");

export function uploadPath(storedName) {
  const normalized = String(storedName || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const full = path.resolve(UPLOAD_ROOT, normalized);
  if (full !== UPLOAD_ROOT && !full.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw new Error("Path traversal rejected");
  }
  return full;
}

export async function ensureUploadRoot() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

export async function saveUpload(file) {
  await ensureUploadRoot();
  const original = String(file.name || "file");
  const ext = safeExtension(original);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw Object.assign(new Error("extension"), { code: "file_type" });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniffFileKind(buffer);
  const expected = {
    pdf: "pdf",
    xlsx: "zip",
    xls: "cfb",
    csv: "text",
    txt: "text",
    png: "png",
    jpg: "jpeg",
    jpeg: "jpeg",
    webp: "webp",
  }[ext];
  if (expected && kind !== expected) {
    throw Object.assign(new Error("content"), { code: "file_type" });
  }

  const stamp = new Date();
  const folder = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}`;
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const storedName = path.join(folder, `${crypto.randomBytes(12).toString("hex")}.${ext}`);
  await fs.writeFile(path.join(UPLOAD_ROOT, storedName), buffer);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    storedName,
    originalName: original.slice(0, 200),
    mime: file.type || "",
    size: buffer.length,
    sha256,
  };
}

export async function removeUpload(storedName) {
  try {
    await fs.unlink(uploadPath(storedName));
  } catch {
    /* already gone */
  }
}

export async function statUpload(storedName) {
  const full = uploadPath(storedName);
  const stat = await fs.stat(full);
  return { full, size: stat.size, mtime: stat.mtime };
}
