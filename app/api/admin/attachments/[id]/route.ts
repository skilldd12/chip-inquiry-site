import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "node:fs/promises";
import { requireAdmin } from "@/lib/auth";
import { audit, getAttachment } from "@/lib/db.js";
import { uploadPath } from "@/lib/storage.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ ok: false, message: "unauthorised" }, { status: 401 });
  }

  const { id } = await context.params;
  const attachment = getAttachment(Number(id));
  if (!attachment) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const buffer = await fs.readFile(uploadPath(attachment.stored_name));
    audit(session.email, "attachment.download", `attachment:${attachment.id}`, attachment.original_name);
    const safeName = attachment.original_name.replace(/["\\\r\n]/g, "_");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": attachment.mime || "application/octet-stream",
        "content-length": String(buffer.length),
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "file_missing" }, { status: 410 });
  }
}
