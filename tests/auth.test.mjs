import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.ADMIN_SESSION_SECRET = "test-secret-value-with-enough-characters";
process.env.DATA_DIR = path.join(os.tmpdir(), `chip-auth-test-${Date.now()}`);
process.env.ADMIN_EMAIL = "owner@example.com";
process.env.ADMIN_PASSWORD = "super-secret-pass";

const auth = await import("../lib/auth.js");

test("scrypt hashes verify but do not leak the password", () => {
  const hash = auth.hashPassword("super-secret-pass");
  assert.ok(hash.startsWith("scrypt$"));
  assert.equal(hash.includes("super-secret-pass"), false);
  assert.equal(auth.verifyPassword("super-secret-pass", hash), true);
  assert.equal(auth.verifyPassword("wrong-pass", hash), false);
});

test("session tokens round-trip and reject tampering", () => {
  const token = auth.signSession({
    sub: "1",
    email: "owner@example.com",
    name: "Owner",
    role: "owner",
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  const payload = auth.readSession(token);
  assert.equal(payload.email, "owner@example.com");

  const [body, sig] = token.split(".");
  const forged = `${body}.${sig.slice(0, -2)}aa`;
  assert.equal(auth.readSession(forged), null);
  assert.equal(auth.readSession("garbage"), null);
});

test("expired sessions are refused", () => {
  const token = auth.signSession({
    sub: "1",
    email: "owner@example.com",
    name: "Owner",
    role: "owner",
    exp: Math.floor(Date.now() / 1000) - 10,
  });
  assert.equal(auth.readSession(token), null);
});

test("IP hashes are stable and non-reversible", () => {
  const a = auth.hashIp("203.0.113.7");
  const b = auth.hashIp("203.0.113.7");
  assert.equal(a, b);
  assert.equal(a.includes("203.0.113.7"), false);
  assert.notEqual(a, auth.hashIp("203.0.113.8"));
});

/* 回归：生产构建下若未配置 ADMIN_SESSION_SECRET，公开询价接口不应因 IP 哈希而 500。
   公网可写的接口不能依赖只在后台才需要的密钥。 */
test("IP hashing still works in production without an admin secret", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  process.env.NODE_ENV = "production";
  try {
    const value = auth.hashIp("198.51.100.9");
    assert.match(value, /^[0-9a-f]{32}$/);
    assert.equal(value.includes("198.51.100.9"), false);
    /* 后台页面在密钥缺失时表现为"未登录"，而不是 500 */
    assert.equal(auth.readSession("abc.def"), null);
    /* 会话签名仍必须拒绝启动——不能因为放宽哈希就放宽鉴权 */
    assert.throws(() => auth.signSession({ sub: "1", exp: 1 }), /ADMIN_SESSION_SECRET/);
  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
  }
});

test("first-run bootstrap creates an owner that can authenticate", () => {
  const result = auth.ensureAdminSeed();
  assert.equal(result.created, true);
  const user = auth.authenticate("owner@example.com", "super-secret-pass");
  assert.ok(user);
  assert.equal(auth.authenticate("owner@example.com", "nope"), null);
  assert.equal(auth.ensureAdminSeed().created, false);
});

test("session cookie is httpOnly and scoped", () => {
  const options = auth.sessionCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.path, "/");
  assert.equal(options.sameSite, "lax");
});
