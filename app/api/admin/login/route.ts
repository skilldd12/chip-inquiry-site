import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  authenticate,
  createSessionFor,
  ensureAdminSeed,
  sessionCookieOptions,
} from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limit = rateLimit(`login:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, message: "Too many attempts." }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  ensureAdminSeed();

  const user = authenticate(String(body.email || ""), String(body.password || ""));
  if (!user) {
    return NextResponse.json({ ok: false, message: "invalid_credentials" }, { status: 401 });
  }

  /* 口令正确但服务端没配密钥时，给出可运维的错误而不是 500 堆栈 */
  let token: string;
  try {
    token = createSessionFor(user);
  } catch (error) {
    console.error("[admin-login] 会话密钥缺失：", (error as Error).message);
    return NextResponse.json(
      {
        ok: false,
        message: "server_misconfigured",
        detail: "ADMIN_SESSION_SECRET 未配置或长度不足 24 字符",
      },
      { status: 503 }
    );
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ ok: true, email: user.email });
}
