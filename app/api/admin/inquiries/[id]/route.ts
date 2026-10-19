import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { INQUIRY_STATUSES, updateInquiry } from "@/lib/db.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await context.params;
  const inquiryId = Number(id);
  if (!Number.isInteger(inquiryId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let body: { status?: string; internalNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (body.status && !INQUIRY_STATUSES.includes(body.status)) {
    return NextResponse.json({ ok: false, message: "invalid_status" }, { status: 400 });
  }

  const ok = updateInquiry(
    inquiryId,
    { status: body.status, internalNote: body.internalNote },
    session.email
  );

  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
