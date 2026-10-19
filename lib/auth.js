/**
 * Admin authentication: scrypt password hashes + signed, HttpOnly session
 * cookies. No client-side gate, every admin route and API re-checks the cookie.
 */
import crypto from "node:crypto";
import { countAdmins, createAdmin, findAdminByEmail } from "./db.js";

export const SESSION_COOKIE = "rfq_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 24) return secret;
  // Development fallback: documented in README, refused in production builds.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_SESSION_SECRET is required in production (min 24 characters)."
    );
  }
  return "dev-only-insecure-secret-change-me-please";
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signSession(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", sessionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function readSession(token) {
  if (!token) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  let expected;
  try {
    expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  } catch (error) {
    /* 密钥缺失时把"未登录"当作结果，别让后台页面直接 500；
       真正的运维错误由登录接口以 503 server_misconfigured 明确报出。 */
    if (!ipHashWarned) {
      ipHashWarned = true;
      console.warn(`[auth] 无法校验会话：${error.message}`);
    }
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.sub || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Returns the signed-in admin payload or null. Safe in server components. */
export async function getSession() {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

/**
 * IP 哈希专用密钥，与会话签名密钥解耦。
 *
 * 原因（真实故障回归）：公开询价接口用 hashIp 做限流与去重键。若它直接复用
 * sessionSecret()，则生产环境一旦没配 ADMIN_SESSION_SECRET，公网可写的询价接口
 * 就会 500——后台配置缺失不应该打断前台转化。
 * 因此这里退化为固定盐（仍为单向哈希，仍不落原始 IP），同时打印一次告警；
 * 会话签名依旧强制要求密钥，鉴权强度不变。
 */
let ipHashWarned = false;

function ipHashSecret() {
  const dedicated = process.env.IP_HASH_SECRET;
  if (dedicated && dedicated.length >= 16) return dedicated;
  try {
    return sessionSecret();
  } catch {
    if (!ipHashWarned) {
      ipHashWarned = true;
      console.warn(
        "[auth] 未配置 IP_HASH_SECRET 或 ADMIN_SESSION_SECRET：IP 哈希使用固定盐，" +
          "仅用于限流与去重，不用于鉴权。生产环境建议单独设置 IP_HASH_SECRET。"
      );
    }
    return "fallback-ip-hash-salt-not-for-auth";
  }
}

export function hashIp(ip) {
  return crypto
    .createHmac("sha256", ipHashSecret())
    .update(String(ip || "unknown"))
    .digest("hex")
    .slice(0, 32);
}

/**
 * First-run bootstrap: creates the owner account from env or a documented
 * development default. Runs once, when the admin table is empty.
 */
export function ensureAdminSeed() {
  if (countAdmins() > 0) return { created: false };
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "demo-admin-2026";
  createAdmin({
    email,
    name: process.env.ADMIN_NAME || "Administrator",
    passwordHash: hashPassword(password),
    role: "owner",
  });
  return { created: true, email, usingDefaultPassword: !process.env.ADMIN_PASSWORD };
}

export function createSessionFor(user) {
  return signSession({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
}

export function authenticate(email, password) {
  const user = findAdminByEmail(email);
  if (!user) {
    // Constant-ish work factor to avoid trivial user enumeration by timing.
    hashPassword(String(password || "x"));
    return null;
  }
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}
