import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const MAX_EDITORIAL_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_EDITORIAL_BODY_BYTES = MAX_EDITORIAL_IMAGE_BYTES + 64 * 1024;

export class EditorialUploadError extends Error {
  status: number;
  constructor(message: string, status: number = 400) { super(message); this.status = status; }
}

export function editorialImageExtension(buffer: Buffer): "png" | "jpg" | "webp" | "avif" | null {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.toString("ascii", 12, 16) === "IHDR") return "png";
  if (buffer.length >= 12 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217) return "jpg";
  if (buffer.length >= 20 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" && ["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16)) && buffer.readUInt32LE(4) + 8 === buffer.length) return "webp";
  if (buffer.length >= 24 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const boxSize = buffer.readUInt32BE(0);
    if (boxSize >= 20 && boxSize <= buffer.length && boxSize % 4 === 0) {
      const brands = [buffer.toString("ascii", 8, 12)];
      for (let index = 16; index + 4 <= boxSize; index += 4) brands.push(buffer.toString("ascii", index, index + 4));
      if (brands.includes("avif") || brands.includes("avis")) return "avif";
    }
  }
  return null;
}

/** Bound bytes before multipart parsing, including when Content-Length is absent. */
export async function readEditorialForm(request: Request): Promise<FormData> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_EDITORIAL_BODY_BYTES) throw new EditorialUploadError("图片不能超过 8 MB。", 413);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) throw new EditorialUploadError("请选择图片文件。");
  if (!request.body) throw new EditorialUploadError("缺少图片文件。");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_EDITORIAL_BODY_BYTES) { await reader.cancel(); throw new EditorialUploadError("图片不能超过 8 MB。", 413); }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  try { return await new Response(Buffer.concat(chunks), { headers: { "content-type": contentType } }).formData(); }
  catch { throw new EditorialUploadError("图片上传数据无法读取。"); }
}

export async function saveEditorialImage(file: File, directory = path.resolve(process.cwd(), "public/uploads/editorial")): Promise<string> {
  if (!file.size || file.size > MAX_EDITORIAL_IMAGE_BYTES) throw new EditorialUploadError("请选择不超过 8 MB 的图片。", file.size ? 413 : 400);
  // Reject filenames containing separators rather than normalizing a potentially hostile path.
  if (/[\\/]/.test(file.name) || !/\.(png|jpe?g|webp|avif)$/i.test(file.name)) throw new EditorialUploadError("仅支持 PNG、JPEG、WebP 和 AVIF 图片。");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_EDITORIAL_IMAGE_BYTES) throw new EditorialUploadError("图片不能超过 8 MB。", 413);
  const extension = editorialImageExtension(buffer);
  const provided = file.name.split(".").pop()?.toLowerCase().replace("jpeg", "jpg");
  const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
  if (!extension || provided !== extension || (file.type && file.type !== "application/octet-stream" && file.type !== mime)) throw new EditorialUploadError("图片内容与文件格式不匹配。");
  const basename = `${crypto.randomBytes(18).toString("hex")}.${extension}`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, basename), buffer, { flag: "wx" });
  return `/uploads/editorial/${basename}`;
}
