import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { audit, getDb } from "@/lib/db.js";
import { COLLECTIONS } from "@/lib/admin-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coerce(type: string, raw: unknown) {
  if (type === "checkbox") return raw === true || raw === "on" || raw === 1 || raw === "1" ? 1 : 0;
  if (type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  if (raw === null || raw === undefined) return "";
  return String(raw).slice(0, 8000);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { table?: string; id?: number | string; values?: Record<string, unknown>; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }

  const collection = body.table ? COLLECTIONS[body.table] : undefined;
  if (!collection) {
    return NextResponse.json({ ok: false, message: "unknown_table" }, { status: 400 });
  }

  const db = getDb();
  const table = collection.table;

  try {
    if (body.action === "delete") {
      if (collection.compositeKey) {
        const values = body.values || {};
        db.prepare(
          `DELETE FROM ${table} WHERE ${collection.compositeKey.map((k) => `${k} = ?`).join(" AND ")}`
        ).run(...collection.compositeKey.map((k) => String(values[k] ?? "")));
      } else {
        const id = Number(body.id);
        if (!Number.isInteger(id)) return NextResponse.json({ ok: false }, { status: 400 });
        db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      }
      audit(session.email, `${table}.delete`, String(body.id ?? ""), "");
      return NextResponse.json({ ok: true });
    }

    const values = body.values || {};
    const columns = collection.fields.map((f) => f.key);
    const coerced = collection.fields.map((f) => coerce(f.type, values[f.key]));

    if (collection.compositeKey) {
      const updateCols = columns.filter((c) => !collection.compositeKey!.includes(c));
      const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})
        ON CONFLICT(${collection.compositeKey.join(",")}) DO UPDATE SET ${updateCols
          .map((c) => `${c} = excluded.${c}`)
          .join(", ")}`;
      db.prepare(sql).run(...coerced);
      audit(session.email, `${table}.upsert`, columns.slice(0, 2).join(":"), "");
      return NextResponse.json({ ok: true });
    }

    const id = Number(body.id);
    if (Number.isInteger(id) && id > 0) {
      const updateCols = columns.filter((c) => c !== "id");
      db.prepare(
        `UPDATE ${table} SET ${updateCols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`
      ).run(...collection.fields.filter((f) => f.key !== "id").map((f) => coerce(f.type, values[f.key])), id);
      audit(session.email, `${table}.update`, `${table}:${id}`, "");
      return NextResponse.json({ ok: true, id });
    }

    const result = db
      .prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`)
      .run(...coerced);
    const newId = Number(result.lastInsertRowid);
    audit(session.email, `${table}.create`, `${table}:${newId}`, "");
    return NextResponse.json({ ok: true, id: newId });
  } catch (error) {
    console.error("collection save failed", error);
    return NextResponse.json({ ok: false, message: "save_failed" }, { status: 400 });
  }
}
