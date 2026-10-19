import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  normalizeMpn,
  validateInquiry,
} from "@/lib/core.js";
import {
  addAttachment,
  createInquiry,
  findRecentDuplicate,
  getConfig,
  setNotificationStatus,
} from "@/lib/db.js";
import { hashIp } from "@/lib/auth.js";
import { rateLimit, clientIp } from "@/lib/ratelimit.js";
import { notifySales } from "@/lib/notify.js";
import { removeUpload, saveUpload } from "@/lib/storage.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limit = rateLimit(`inquiry:${ip}`, 6, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many submissions, please retry later." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Unsupported request body." }, { status: 400 });
  }

  const raw = form.get("payload");
  if (typeof raw !== "string" || raw.length > 60_000) {
    return NextResponse.json({ ok: false, message: "Missing payload." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, message: "Malformed payload." }, { status: 400 });
  }

  const incoming = form.getAll("files").filter((entry): entry is File => typeof entry !== "string");

  if (incoming.length > MAX_FILES) {
    return NextResponse.json({ ok: false, errors: { files: "file_count" } }, { status: 400 });
  }
  for (const file of incoming) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, errors: { files: "file_size" } }, { status: 400 });
    }
  }

  if (payload.consent !== true) {
    return NextResponse.json({ ok: false, errors: { consent: "consent_required" } }, { status: 400 });
  }

  const validation = validateInquiry(payload, { hasAttachment: incoming.length > 0 });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, errors: validation.errors }, { status: 400 });
  }

  const saved = [];
  try {
    for (const file of incoming) {
      saved.push(await saveUpload(file));
    }
  } catch (error) {
    await Promise.all(saved.map((file) => removeUpload(file.storedName)));
    const code = error && typeof error === "object" && "code" in error ? error.code : "file_type";
    return NextResponse.json({ ok: false, errors: { files: code } }, { status: 400 });
  }

  const values = validation.values;
  const firstMpn = values.items?.[0]?.mpn ? normalizeMpn(values.items[0].mpn) : "";
  const dedupeKey = `${values.email || values.phone || ""}|${firstMpn}`;

  const duplicate = findRecentDuplicate(dedupeKey, 10);
  if (duplicate) {
    await Promise.all(saved.map((file) => removeUpload(file.storedName)));
    return NextResponse.json({ ok: true, code: duplicate.code, duplicate: true });
  }

  const record = {
    id: 0,
    code: "",
    createdAt: new Date().toISOString(),
    company: values.company || "",
    contactName: values.contactName || "",
    email: values.email || "",
    phone: values.phone || "",
    country: values.country || "",
    locale: values.locale,
    items: values.items || [],
    attachments: saved,
    message: values.message || "",
  };

  try {
    const created = createInquiry(values, {
      ipHash: hashIp(ip),
      userAgent: request.headers.get("user-agent") || "",
      dedupeKey,
      kind: "rfq",
      normalizeMpn,
    });
    record.id = created.id;
    record.code = created.code;
    record.createdAt = created.createdAt;

    for (const file of saved) {
      addAttachment({ inquiryId: created.id, ...file });
    }

    const config = getConfig();
    const result = await notifySales(record, config);
    setNotificationStatus(created.id, result.status, result.detail);

    return NextResponse.json({
      ok: true,
      id: created.id,
      code: created.code,
      notification: result.status,
    });
  } catch (error) {
    await Promise.all(saved.map((file) => removeUpload(file.storedName)));
    console.error("inquiry save failed", error);
    return NextResponse.json(
      { ok: false, message: "The request could not be stored. Please retry." },
      { status: 500 }
    );
  }
}
