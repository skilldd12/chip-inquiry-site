import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import {
  guessMapping,
  importSummary,
  planImport,
  validateImportRow,
  IMPORT_FIELDS,
} from "@/lib/core.js";
import { createImportBatch, findPartsByKeys } from "@/lib/db.js";
import { readTable } from "@/lib/import.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 2000;
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "file_too_large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let table;
  try {
    table = await readTable(buffer, file.name);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "parse_failed";
    return NextResponse.json(
      {
        ok: false,
        message:
          code === "legacy_xls"
            ? "旧版 .xls 不受支持，请另存为 .xlsx 或 .csv 后再导入。"
            : "文件无法解析，请检查格式。",
      },
      { status: 400 }
    );
  }

  if (table.rows.length === 0) {
    return NextResponse.json({ ok: false, message: "empty_file" }, { status: 400 });
  }
  if (table.rows.length > MAX_ROWS) {
    return NextResponse.json({ ok: false, message: "too_many_rows" }, { status: 400 });
  }

  let mapping: Record<string, string> = guessMapping(table.headers);
  const rawMapping = form.get("mapping");
  if (typeof rawMapping === "string" && rawMapping.trim()) {
    try {
      const parsed = JSON.parse(rawMapping);
      mapping = {};
      for (const field of IMPORT_FIELDS) {
        if (typeof parsed[field.key] === "string" && parsed[field.key]) {
          mapping[field.key] = parsed[field.key];
        }
      }
    } catch {
      return NextResponse.json({ ok: false, message: "invalid_mapping" }, { status: 400 });
    }
  }

  const parsed = table.rows.map((raw, index) => {
    const mapped: Record<string, string> = {};
    for (const field of IMPORT_FIELDS) {
      const source = mapping[field.key];
      mapped[field.key] = source ? String(raw[source] ?? "") : "";
    }
    const validated = validateImportRow(mapped, raw.__row || index + 2);
    if (raw.__formula) {
      validated.errors = [...validated.errors, "formula_not_allowed"];
      validated.ok = false;
    }
    return validated;
  });

  const existing = findPartsByKeys(parsed.filter((row) => row.ok).map((row) => row.key));
  const planned = planImport(parsed, existing, "update");
  const summary = importSummary(planned);

  const token = crypto.randomBytes(18).toString("hex");
  createImportBatch({
    token,
    filename: file.name,
    mapping,
    rows: planned.slice(0, MAX_ROWS),
    summary,
    createdBy: session.email,
  });

  return NextResponse.json({
    ok: true,
    token,
    filename: file.name,
    headers: table.headers,
    mapping,
    summary,
    rowCount: planned.length,
    rows: planned.slice(0, 60).map((row) => ({
      rowNumber: row.rowNumber,
      action: row.action,
      errors: row.errors,
      changes: row.changes,
      values: row.values,
    })),
  });
}
