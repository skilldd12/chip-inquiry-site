import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/db.js";
import { EditorialUploadError, readEditorialForm, saveEditorialImage } from "@/lib/editorial-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ ok: false, message: "请从本站后台上传图片。" }, { status: 403 });
  try {
    const form = await readEditorialForm(request);
    const files = form.getAll("file");
    if (files.length !== 1 || !(files[0] instanceof File)) throw new EditorialUploadError("请一次选择一张图片。");
    const src = await saveEditorialImage(files[0]);
    audit(session.email, "editorial.upload", src);
    return NextResponse.json({ ok: true, src });
  } catch (error) {
    if (error instanceof EditorialUploadError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    console.error("[editorial.upload] Unable to store media");
    return NextResponse.json({ ok: false, message: "图片上传失败，请稍后重试。" }, { status: 500 });
  }
}
