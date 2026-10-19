import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { planImport } from "@/lib/core.js";
import {
  applyImportRow,
  findPartsByKeys,
  getImportBatch,
  logImport,
  markImportBatchApplied,
} from "@/lib/db.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { token?: string; mode?: string; confirm?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.confirm) {
    return NextResponse.json({ ok: false, message: "confirmation_required" }, { status: 400 });
  }
  const mode = body.mode === "update" ? "update" : "create_only";
  const batch = body.token ? getImportBatch(body.token) : null;
  if (!batch) {
    return NextResponse.json({ ok: false, message: "batch_not_found" }, { status: 404 });
  }
  if (batch.applied_at) {
    return NextResponse.json({ ok: false, message: "already_applied" }, { status: 409 });
  }

  const stored = JSON.parse(batch.rows);
  const existing = findPartsByKeys(stored.filter((row: { ok: boolean }) => row.ok).map((row: { key: string }) => row.key));
  // Re-plan against the current database so a stale preview cannot overwrite
  // rows that changed in between.
  const planned = planImport(stored, existing, mode);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failed: { rowNumber: number; errors: string[] }[] = [];

  for (const row of planned) {
    if (!row.ok) {
      failed.push({ rowNumber: row.rowNumber, errors: row.errors });
      continue;
    }
    if (row.action === "create") {
      applyImportRow(row, null, "create");
      created += 1;
    } else if (row.action === "update") {
      applyImportRow(row, row.existingId, "update");
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  logImport({
    filename: batch.filename,
    mode,
    created,
    updated,
    skipped,
    failed: failed.length,
    detail: JSON.stringify({ summary: batch.summary }).slice(0, 500),
  });
  markImportBatchApplied(batch.token);

  return NextResponse.json({
    ok: true,
    mode,
    created,
    updated,
    skipped,
    failed: failed.length,
    errors: failed.slice(0, 30),
    errorsUrl: failed.length ? `/api/admin/import/errors?token=${batch.token}` : null,
  });
}
