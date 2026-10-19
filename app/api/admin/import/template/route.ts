import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildTemplate } from "@/lib/import.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return new Response("unauthorised", { status: 401 });

  const buffer = await buildTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="parts-import-template.xlsx"',
      "cache-control": "no-store",
    },
  });
}
