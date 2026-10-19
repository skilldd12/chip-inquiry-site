import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cleanText, isValidEmail } from "@/lib/core.js";
import { createInquiry, getConfig, setNotificationStatus } from "@/lib/db.js";
import { hashIp } from "@/lib/auth.js";
import { rateLimit, clientIp } from "@/lib/ratelimit.js";
import { notifySales } from "@/lib/notify.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limit = rateLimit(`contact:${ip}`, 6, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { name?: string; email?: string; message?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const email = cleanText(body.email, 160);
  const message = cleanText(body.message, 2000);
  const name = cleanText(body.name, 80);
  if (!isValidEmail(email) || message.length < 5) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const values = {
    company: "",
    contactName: name,
    email,
    phone: "",
    country: "",
    message,
    locale: ["zh", "en", "ru"].includes(String(body.locale)) ? body.locale : "zh",
    items: [],
  };

  try {
    const created = createInquiry(values, {
      ipHash: hashIp(ip),
      userAgent: request.headers.get("user-agent") || "",
      kind: "contact",
    });
    const result = await notifySales(
      { ...values, id: created.id, code: created.code, createdAt: created.createdAt },
      getConfig()
    );
    setNotificationStatus(created.id, result.status, result.detail);
    return NextResponse.json({ ok: true, code: created.code });
  } catch (error) {
    console.error("contact save failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
