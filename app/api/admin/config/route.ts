import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConfig, setConfig } from "@/lib/db.js";
import { validateEditorialConfig } from "@/lib/editorial-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KEYS = ["company", "notification", "hero", "media", "legal", "editorial"];
const COMPANY_KEYS = [
  "name_zh",
  "name_en",
  "legal_name",
  "short_zh",
  "short_en",
  "founded",
  "email",
  "phone",
  "whatsapp",
  "wechat",
  "address_zh",
  "address_en",
  "address_ru",
  "hours_zh",
  "hours_en",
  "hours_ru",
  "pending_note",
];

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, message: "请从本站后台保存设置。" }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ ok: false, message: "配置保存需要 JSON 数据。" }, { status: 415 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const current = getConfig();
  const patch: Record<string, unknown> = {};

  if ("editorial" in body) {
    const result = validateEditorialConfig(body.editorial);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
    }
    patch.editorial = result.value;
  }

  if (body.company && typeof body.company === "object") {
    const company = body.company as Record<string, unknown>;
    const next: Record<string, unknown> = { ...(current.company || {}) };
    for (const key of COMPANY_KEYS) {
      if (key in company) {
        next[key] = key === "pending_note" ? Boolean(company[key]) : String(company[key] ?? "").slice(0, 300);
      }
    }
    patch.company = next;
  }

  if (body.notification && typeof body.notification === "object") {
    const n = body.notification as Record<string, unknown>;
    patch.notification = {
      sales_email: String(n.sales_email ?? "").slice(0, 200),
      webhook_url: String(n.webhook_url ?? "").slice(0, 500),
      enabled: Boolean(n.enabled),
    };
  }

  if (body.hero && typeof body.hero === "object") {
    const h = body.hero as Record<string, unknown>;
    patch.hero = {
      ...(current.hero || {}),
      image_01: String(h.image_01 ?? "").slice(0, 300),
      image_02: String(h.image_02 ?? "").slice(0, 300),
      image_03: String(h.image_03 ?? "").slice(0, 300),
    };
  }

  if (body.media && typeof body.media === "object") {
    const m = body.media as Record<string, unknown>;
    patch.media = { ...(current.media || {}), warehouse: String(m.warehouse ?? "").slice(0, 300) };
  }

  if (body.legal && typeof body.legal === "object") {
    const l = body.legal as Record<string, unknown>;
    patch.legal = { ...(current.legal || {}), updated: String(l.updated ?? "").slice(0, 20) };
  }

  const keys = Object.keys(patch).filter((k) => ALLOWED_KEYS.includes(k));
  if (keys.length === 0) {
    return NextResponse.json({ ok: false, message: "nothing_to_save" }, { status: 400 });
  }

  setConfig(patch, session.email);
  revalidatePath("/[locale]", "layout");
  return NextResponse.json({ ok: true, keys });
}
