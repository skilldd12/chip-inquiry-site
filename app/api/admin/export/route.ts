import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listInquiries } from "@/lib/db.js";
import { toCsv } from "@/lib/core.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = [
  "code",
  "created_at",
  "status",
  "kind",
  "company",
  "contact_name",
  "email",
  "phone",
  "country",
  "locale",
  "items",
  "attachments",
  "notification_status",
  "message",
];

/** CSV export with formula-injection guarding and a UTF-8 BOM for Excel. */
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return new Response("unauthorised", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const result = listInquiries({
    status: params.get("status") || undefined,
    q: params.get("q") || undefined,
    limit: 5000,
    offset: 0,
  });

  const rows = result.rows.map((row) => [
    row.code,
    row.created_at,
    row.status,
    row.kind,
    row.company,
    row.contact_name,
    row.email,
    row.phone,
    row.country,
    row.locale,
    row.item_count,
    row.attachment_count,
    row.notification_status,
    row.message,
  ]);

  const csv = `\uFEFF${toCsv(HEADERS, rows)}`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="inquiries-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
