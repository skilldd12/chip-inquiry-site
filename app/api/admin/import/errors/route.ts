import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getImportBatch } from "@/lib/db.js";
import { buildErrorWorkbook } from "@/lib/import.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return new Response("unauthorised", { status: 401 });

  const token = request.nextUrl.searchParams.get("token") || "";
  const batch = getImportBatch(token);
  if (!batch) return new Response("not found", { status: 404 });

  const rows = JSON.parse(batch.rows).filter((row: { ok: boolean }) => !row.ok);
  const buffer = await buildErrorWorkbook(rows);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="import-errors.xlsx"',
      "cache-control": "no-store",
    },
  });
}
